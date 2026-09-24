// src/modules/payments/payments.service.js
// Lógica de negocio para pagos, descuentos, auto-cierre y deducción de inventario

const paymentsRepository = require("./payments.repository");
const accountsService = require("../accounts/accounts.service");
const printService = require("../../../server/print-service");
const { normalizePaymentMethodCode } = require("../../common/utils");
const { BadRequestError, NotFoundError } = require("../../common/errors");

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

    // Si la cuenta se cerró, disparar impresión de recibo si hay impresora configurada
    if (accountJustClosed) {
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

    return { ok: true };
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

      const receipt = {
        account,
        items,
        payments,
        totals,
      };

      const result = await printService.printCustomerReceipt(
        receipt,
        terminal,
        { name: restaurantName }
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
};

module.exports = paymentsService;
