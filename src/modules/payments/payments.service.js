// src/modules/payments/payments.service.js
// Lógica de negocio para pagos, descuentos, auto-cierre y deducción de inventario

const paymentsRepository = require("./payments.repository");
const accountsRepository = require("../accounts/accounts.repository");
const accountsService = require("../accounts/accounts.service");
const printService = require("../../../server/print-service");
const { normalizePaymentMethodCode } = require("../../common/utils");
const { BadRequestError, NotFoundError } = require("../../common/errors");
const { emitEvent } = require("../../common/sockets");

const paymentsService = {
  /**
   * Agrega un descuento a una cuenta y recalcula los totales.
   */
  async addDiscount({ accountId, type, value, reason = "", createdBy }) {
    const parsedAccountId = Number(accountId);
    if (!parsedAccountId) throw new BadRequestError("accountId inválido");

    if (!["percent", "fixed"].includes(type)) {
      throw new BadRequestError("type inválido (debe ser 'percent' o 'fixed')");
    }

    const valueNum = Number(value || 0);
    if (!valueNum || valueNum <= 0 || !createdBy) {
      throw new BadRequestError("value y createdBy son requeridos");
    }

    await paymentsRepository.insertDiscount({
      accountId: parsedAccountId,
      type,
      value: valueNum,
      reason,
      createdBy,
    });

    await accountsService.addAccountEvent(
      parsedAccountId,
      "discount_added",
      { type, value: valueNum, reason },
      createdBy
    );

    return accountsService.getAccountTotals(parsedAccountId);
  },

  /**
   * Descuenta stock en inventario por los platillos vendidos en la cuenta.
   */
  async deductInventoryForAccount(accountId, conn = null) {
    try {
      const items = await paymentsRepository.findItemsForInventoryDeduction(accountId, conn);
      for (const item of items) {
        if (!item.track_inventory) continue;
        const recipe = await paymentsRepository.findProductRecipe(item.product_id, conn);
        for (const ingredient of recipe) {
          const deductQty = ingredient.quantity * item.qty;
          await paymentsRepository.recordStockExit(
            {
              inventoryItemId: ingredient.inventory_item_id,
              quantity: deductQty,
              accountId,
            },
            conn
          );
          await paymentsRepository.decrementCurrentStock(
            ingredient.inventory_item_id,
            deductQty,
            conn
          );
        }
      }
    } catch (e) {
      console.error("[INVENTORY] Error deduciendo inventario:", e.message);
    }
  },

  /**
   * Registra un pago en la cuenta, deduce inventario y cierra la cuenta si se cubre el total.
   */
  async addPayment({ accountId, method, amount, referenceNo = "", userId = null }) {
    const parsedAccountId = Number(accountId);
    if (!parsedAccountId) throw new BadRequestError("accountId inválido");

    const normalizedMethod = normalizePaymentMethodCode(method);
    const amountNum = Number(amount || 0);

    if (!normalizedMethod || !amountNum || amountNum <= 0) {
      throw new BadRequestError("method y amount (> 0) son requeridos");
    }

    const paymentMethodRow = await paymentsRepository.findActivePaymentMethod(normalizedMethod);
    if (!paymentMethodRow) {
      throw new BadRequestError("Forma de pago inválida o inactiva");
    }

    await paymentsRepository.insertPayment({
      accountId: parsedAccountId,
      method: normalizedMethod,
      amount: amountNum,
      referenceNo,
    });

    await accountsService.addAccountEvent(
      parsedAccountId,
      "payment_added",
      { method: normalizedMethod, amount: amountNum, referenceNo },
      userId
    );

    // Deducir inventario
    await this.deductInventoryForAccount(parsedAccountId);

    const totals = await accountsService.getAccountTotals(parsedAccountId);
    let accountJustClosed = false;

    // Emitir evento de nuevo pago en tiempo real
    emitEvent("sales:payment", {
      accountId: parsedAccountId,
      method: normalizedMethod,
      amount: amountNum,
      referenceNo,
      totals,
    });

    if (Number(totals.pending || 0) <= 0) {
      const account = await paymentsRepository.findAccountStatus(parsedAccountId);
      if (account && String(account.status) === "open") {
        await paymentsRepository.markAccountAsPaid(parsedAccountId);
        await accountsService.addAccountEvent(
          parsedAccountId,
          "account_closed_auto",
          totals,
          userId
        );
        accountJustClosed = true;
      }
    }

    // Si la cuenta se cerró, emitir sales:closed y disparar impresión si aplica
    if (accountJustClosed) {
      emitEvent("sales:closed", {
        accountId: parsedAccountId,
        totals,
      });

      this.printCustomerReceipt(parsedAccountId, userId, totals).catch((printErr) => {
        console.error(`[PRINT] Error preparando recibo: ${printErr.message}`);
      });
    }

    return totals;
  },

  /**
   * Cierra manualmente una cuenta ya liquidada.
   */
  async closeAccount({ accountId, userId = null }) {
    const parsedAccountId = Number(accountId);
    if (!parsedAccountId) throw new BadRequestError("accountId inválido");

    const totals = await accountsService.getAccountTotals(parsedAccountId);
    if (Number(totals.pending || 0) > 0) {
      throw new BadRequestError("La cuenta aún tiene saldo pendiente");
    }

    await paymentsRepository.markAccountAsPaid(parsedAccountId);
    await accountsService.addAccountEvent(parsedAccountId, "account_closed", totals, userId);

    emitEvent("sales:closed", {
      accountId: parsedAccountId,
      totals,
    });

    return { ok: true };
  },

  /**
   * Elimina un pago registrado incorrectamente (solo permitido en cuentas abiertas y turnos activos).
   */
  async deletePayment({ paymentId, accountId, userId = null }) {
    const parsedPaymentId = Number(paymentId);
    const parsedAccountId = Number(accountId);

    if (!parsedPaymentId || !parsedAccountId) {
      throw new BadRequestError("paymentId y accountId son requeridos");
    }

    const payment = await paymentsRepository.findPaymentById(parsedPaymentId);
    if (!payment || Number(payment.account_id) !== parsedAccountId) {
      throw new NotFoundError("Pago no encontrado para esta cuenta");
    }

    const account = await accountsRepository.findById(parsedAccountId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");

    if (String(account.status) !== "open") {
      throw new BadRequestError("Solo puedes modificar pagos de cuentas abiertas. Reabre la cuenta primero.");
    }

    if (account.shift_id) {
      const shift = await accountsRepository.findAccountShift(parsedAccountId);
      if (shift && String(shift.status) === "closed") {
        throw new BadRequestError(
          `No se puede modificar el pago: el turno #${shift.id} ya fue cerrado.`
        );
      }
    }

    await paymentsRepository.deletePayment(parsedPaymentId, parsedAccountId);

    await accountsService.addAccountEvent(
      parsedAccountId,
      "payment_deleted",
      {
        paymentId: parsedPaymentId,
        method: payment.method,
        amount: Number(payment.amount),
        deletedBy: userId,
      },
      userId
    );

    const totals = await accountsService.getAccountTotals(parsedAccountId);

    emitEvent("sales:update", {
      accountId: parsedAccountId,
      totals,
    });

    return totals;
  },

  /**
   * Imprime el recibo de compra para el cliente en la terminal asociada.
   */
  async printCustomerReceipt(accountId, userId, totals) {
    try {
      const terminal = await paymentsRepository.findTerminalForUser(userId);
      if (!terminal?.printer_ip) return;

      const account = await paymentsRepository.findAccountReceiptData(accountId);
      if (!account) return;

      const items = await paymentsRepository.findAccountReceiptItems(accountId);
      const payments = await paymentsRepository.findAccountReceiptPayments(accountId);
      const restaurantName = await paymentsRepository.findRestaurantName();

      let felInvoice = null;
      let felConfig = null;
      try {
        const felRepository = require("../fel/fel.repository");
        felInvoice = await felRepository.findInvoiceByAccountId(accountId);
        felConfig = await felRepository.getConfig();
      } catch (felErr) {}

      const receipt = {
        account,
        items,
        payments,
        totals,
        felInvoice,
      };

      const result = await printService.printCustomerReceipt(
        receipt,
        terminal,
        {
          name: restaurantName,
          commercial_name: felConfig?.commercial_name,
          address: felConfig?.issuer_name,
          nit: felConfig?.issuer_nit,
          establishment_code: felConfig?.establishment_code,
        },
        {
          copies: felConfig?.receipt_copies || 1,
        }
      );

      if (!result.ok && !result.skipped) {
        console.warn(
          `[PRINT] Falló imprimiendo recibo cuenta ${account.check_number}: ${result.error}`
        );
      }
    } catch (e) {
      console.error(`[PRINT] Excepción imprimiendo recibo: ${e.message}`);
    }
  },

  /**
   * Modifica el método de pago de una transacción registrada (rectificación de cobros),
   * requiriendo PIN de supervisor y verificando que el turno no esté cerrado.
   */
  async changePaymentMethod({ accountId, paymentId, newMethod, reason = "", authPin = null, session = null }) {
    const parsedAccountId = Number(accountId);
    const parsedPaymentId = Number(paymentId);
    if (!parsedAccountId || !parsedPaymentId) {
      throw new BadRequestError("accountId y paymentId son requeridos");
    }

    const account = await accountsRepository.findById(parsedAccountId);
    if (!account) {
      throw new NotFoundError("Cuenta no encontrada");
    }

    if (account.shift_id) {
      const shift = await accountsRepository.findAccountShift(parsedAccountId);
      if (shift && String(shift.status) === "closed") {
        throw new BadRequestError(
          `No se puede rectificar el pago: el turno #${shift.id} ya fue cerrado. Por integridad contable, los turnos cerrados no admiten cambios.`
        );
      }
    }

    let authorizer = null;
    if (authPin) {
      const ordersRepository = require("../orders/orders.repository");
      const authResult = await ordersRepository.findManagerOrAdminByPin(authPin);
      if (!authResult || !authResult.ok) {
        throw new ForbiddenError(authResult?.message || "PIN inválido o sin permisos de supervisor para rectificar pagos");
      }
      authorizer = authResult.user;
    } else if (session) {
      const role = String(session.role || "").toLowerCase();
      if (role === "admin" || role === "manager" || (session.permissions && session.permissions.includes("accounts.reopen"))) {
        authorizer = { id: session.userId || session.id, full_name: session.userName || "Supervisor" };
      } else {
        throw new ForbiddenError("Se requiere PIN de supervisor para rectificar formas de pago");
      }
    } else {
      throw new ForbiddenError("Se requiere PIN de supervisor para rectificar formas de pago");
    }

    const payment = await paymentsRepository.findPaymentById(parsedPaymentId);
    if (!payment || Number(payment.account_id) !== parsedAccountId) {
      throw new NotFoundError("Pago no encontrado para esta cuenta");
    }

    const normalizedNewMethod = normalizePaymentMethodCode(newMethod);
    if (!normalizedNewMethod) {
      throw new BadRequestError("Nueva forma de pago inválida");
    }

    const paymentMethodRow = await paymentsRepository.findActivePaymentMethod(normalizedNewMethod);
    if (!paymentMethodRow) {
      throw new BadRequestError("Forma de pago inactiva o no admitida");
    }

    const oldMethod = payment.method;
    await paymentsRepository.updatePaymentMethod(parsedPaymentId, normalizedNewMethod);

    await accountsRepository.addEvent(
      parsedAccountId,
      "payment_method_changed",
      {
        paymentId: parsedPaymentId,
        oldMethod,
        newMethod: normalizedNewMethod,
        amount: payment.amount,
        reason: reason || "Rectificación de forma de pago en pre-cierre",
        authorizedBy: authorizer.id,
        authorizerName: authorizer.full_name,
      },
      authorizer.id
    );

    emitEvent("account:updated", { accountId: parsedAccountId });

    return {
      ok: true,
      message: `Forma de pago actualizada a ${paymentMethodRow.label || normalizedNewMethod}`,
      paymentId: parsedPaymentId,
      oldMethod,
      newMethod: normalizedNewMethod,
    };
  },
};

module.exports = paymentsService;
