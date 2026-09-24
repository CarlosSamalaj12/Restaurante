// src/modules/orders/orders.service.js
// Lógica de negocio para toma de pedidos, modificadores, envío a cocina y anulación (void)

const ordersRepository = require("./orders.repository");
const accountsService = require("../accounts/accounts.service");
const printService = require("../../../server/print-service");
const { withTransaction } = require("../../common/db");
const { money, nowSql } = require("../../common/utils");
const { BadRequestError, NotFoundError, ForbiddenError } = require("../../common/errors");

const ordersService = {
  /**
   * Agrega un platillo con sus modificadores y validación de grupos requeridos.
   */
  async addItemToAccount({ accountId, productId, seatNo = 1, qty = 1, notes = "", modifierOptionIds = [] }) {
    const parsedAccountId = Number(accountId);
    const parsedProductId = Number(productId);
    const parsedQty = Number(qty);

    if (!parsedAccountId) throw new BadRequestError("accountId inválido");
    if (!parsedProductId) throw new BadRequestError("productId es requerido");
    if (Number.isNaN(parsedQty) || parsedQty <= 0) throw new BadRequestError("qty debe ser mayor a 0");

    const product = await ordersRepository.findProductForOrder(parsedProductId);
    if (!product) throw new NotFoundError("Producto no encontrado o inactivo");
    const basePrice = Number(product.base_price);

    const normalizedOptionIds = (modifierOptionIds || []).map((x) => Number(x)).filter((x) => !Number.isNaN(x));
    const uniqueOptionIds = [...new Set(normalizedOptionIds)];

    const requiredGroups = await ordersRepository.findRequiredModifierGroups(parsedProductId);
    let selectedOptions = [];

    if (uniqueOptionIds.length) {
      selectedOptions = await ordersRepository.findAllowedModifierOptions(parsedProductId, uniqueOptionIds);
      if (selectedOptions.length !== uniqueOptionIds.length) {
        throw new BadRequestError("Hay opciones de modificador no permitidas para este platillo");
      }
    }

    const selectedGroupCounts = {};
    const groupByOption = selectedOptions.reduce((acc, row) => {
      acc[Number(row.id)] = row;
      return acc;
    }, {});

    for (const optionId of normalizedOptionIds) {
      const option = groupByOption[Number(optionId)];
      if (!option) continue;
      const groupId = Number(option.group_id);
      selectedGroupCounts[groupId] = (selectedGroupCounts[groupId] || 0) + 1;
    }

    for (const group of requiredGroups) {
      const min = Math.max(0, Number(group.min_select || 0));
      const max = Math.max(0, Number(group.max_select || 0));
      const count = Number(selectedGroupCounts[Number(group.id)] || 0);

      if (count < min) {
        throw new BadRequestError(`Debes seleccionar al menos ${min} opcion(es) en ${group.name}`);
      }
      if (max > 0 && count > max) {
        throw new BadRequestError(`Solo puedes seleccionar ${max} opcion(es) en ${group.name}`);
      }
    }

    const priceByOptionId = selectedOptions.reduce((acc, row) => {
      acc[Number(row.id)] = Number(row.price_delta || 0);
      return acc;
    }, {});

    const modifierPrice = normalizedOptionIds.reduce(
      (acc, optId) => acc + Number(priceByOptionId[Number(optId)] || 0),
      0
    );

    const unitPrice = money(basePrice + modifierPrice);
    const lineTotal = money(unitPrice * parsedQty);

    return withTransaction(async (conn) => {
      const itemId = await ordersRepository.insertOrderItem(
        {
          accountId: parsedAccountId,
          productId: parsedProductId,
          seatNo: Number(seatNo) || 1,
          qty: parsedQty,
          unitPrice,
          lineTotal,
          notes,
        },
        conn
      );

      if (normalizedOptionIds.length) {
        const modsToInsert = normalizedOptionIds.map((optId) => ({
          optionId: optId,
          priceDelta: Number(priceByOptionId[Number(optId)] || 0),
        }));
        await ordersRepository.insertOrderItemModifiers(itemId, modsToInsert, conn);
      }

      await accountsService.addAccountEvent(
        parsedAccountId,
        "item_added",
        { itemId, seatNo: Number(seatNo) || 1 },
        null,
        conn
      );

      return { itemId };
    });
  },

  /**
   * Envía a cocina/bar todos los ítems pendientes de una cuenta, genera los tickets agrupados
   * por centro de producción y dispara la impresión térmica en segundo plano.
   */
  async sendOrder(accountId) {
    const parsedAccountId = Number(accountId);
    if (!parsedAccountId) throw new BadRequestError("accountId inválido");

    const account = await ordersRepository.findAccountSummaryForSend(parsedAccountId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");
    if (String(account.status) !== "open") {
      throw new BadRequestError("Solo cuentas abiertas pueden enviarse");
    }

    const items = await ordersRepository.findUnsentOrderItems(parsedAccountId);
    if (!items.length) {
      throw new BadRequestError("No hay productos nuevos por enviar en esta cuenta");
    }

    const itemIds = [...new Set(items.map((x) => Number(x.id)))];
    const itemMods = await ordersRepository.findItemModifiersForSend(itemIds);

    const ticketsMap = new Map();
    for (const item of items) {
      const key = item.center_id ? `C-${item.center_id}` : "C-0";
      if (!ticketsMap.has(key)) {
        ticketsMap.set(key, {
          centerId: item.center_id ? Number(item.center_id) : null,
          centerName: item.center_name || "Restaurante",
          printerName: item.printer_name || "DEFAULT",
          items: [],
        });
      }
      ticketsMap.get(key).items.push({
        itemId: Number(item.id),
        productId: Number(item.product_id),
        productName: item.product_name,
        qty: Number(item.qty || 0),
        seatNo: Number(item.seat_no || 1),
        notes: item.notes || "",
        lineTotal: Number(item.line_total || 0),
        modifiers: itemMods[Number(item.id)] || [],
      });
    }
    const tickets = [...ticketsMap.values()];

    await ordersRepository.markItemsAsSent(parsedAccountId);

    await accountsService.addAccountEvent(
      parsedAccountId,
      "kitchen_ticket_sent",
      {
        checkNumber: account.check_number,
        sentItems: items.length,
        destinations: tickets.map((t) => ({
          centerName: t.centerName,
          printerName: t.printerName,
          count: t.items.length,
        })),
      },
      null
    );

    // Impresión en segundo plano (fire-and-forget)
    const accountMeta = {
      id: parsedAccountId,
      check_number: account.check_number,
      table_code: account.table_code,
      waiter_name: account.waiter_name,
    };

    for (const ticket of tickets) {
      if (!ticket.centerId) continue;
      ordersRepository
        .findProductionCenter(ticket.centerId)
        .then((center) => {
          if (!center) return;
          printService
            .printKitchenTicket(ticket, center, accountMeta)
            .then((result) => {
              if (!result.ok && !result.skipped) {
                console.warn(
                  `[PRINT] Fallo imprimiendo comanda ${ticket.centerName} cuenta ${accountMeta.check_number}: ${result.error}`
                );
              }
            })
            .catch((e) => {
              console.error(`[PRINT] Excepcion imprimiendo comanda: ${e.message}`);
            });
        })
        .catch((lookupErr) => {
          console.error(`[PRINT] Error buscando centro ${ticket.centerId}: ${lookupErr.message}`);
        });
    }

    return {
      ok: true,
      checkNumber: account.check_number,
      sentItems: items.length,
      tickets,
    };
  },

  /**
   * Mueve un ítem a otro número de asiento.
   */
  async moveItemSeat(itemId, newSeatNo) {
    const parsedItemId = Number(itemId);
    const parsedSeatNo = Number(newSeatNo);

    if (!parsedItemId || !parsedSeatNo) {
      throw new BadRequestError("itemId y newSeatNo son requeridos");
    }

    await ordersRepository.updateItemSeat(parsedItemId, parsedSeatNo);
    return { ok: true };
  },

  /**
   * Actualiza la cantidad de un ítem antes de que sea enviado a cocina.
   */
  async updateItemQty(itemId, qty) {
    const parsedItemId = Number(itemId);
    const nextQty = Number(qty);

    if (!parsedItemId || Number.isNaN(nextQty) || nextQty <= 0) {
      throw new BadRequestError("itemId y qty (> 0) son requeridos");
    }

    const item = await ordersRepository.findItemForQtyUpdate(parsedItemId);
    if (!item) throw new NotFoundError("Item no encontrado");
    if (item.sent_at) {
      throw new BadRequestError("No puedes cambiar cantidad de un platillo ya enviado");
    }

    const unitPrice = Number(item.unit_price);
    const lineTotal = money(unitPrice * nextQty);

    await ordersRepository.updateItemQty(parsedItemId, nextQty, lineTotal);
    await accountsService.addAccountEvent(
      Number(item.account_id),
      "item_qty_updated",
      { itemId: parsedItemId, qty: nextQty },
      null
    );

    return { ok: true };
  },

  /**
   * Anula un platillo con auditoría. Si el platillo ya fue enviado a cocina,
   * exige autorización con PIN de gerente/admin y genera un ticket de reversión.
   */
  async voidItem({ itemId, reason = "", authorizedBy = null, authPin = "" }) {
    const parsedItemId = Number(itemId);
    if (!parsedItemId) throw new BadRequestError("itemId inválido");

    const item = await ordersRepository.findItemForVoid(parsedItemId);
    if (!item) throw new NotFoundError("Item no encontrado");
    if (String(item.status) !== "active") {
      throw new BadRequestError("El item ya no esta activo");
    }

    const accountId = Number(item.account_id);
    const isSent = Boolean(item.sent_at);
    let finalAuthorizedBy = Number(authorizedBy || 0) || null;
    let authorizerUser = null;

    if (isSent) {
      const pin = String(authPin || "").trim();
      if (!pin) {
        throw new BadRequestError("PIN de autorizacion requerido para revertir un platillo enviado");
      }
      const authRows = await ordersRepository.findManagerOrAdminByPin(pin);
      if (!authRows) {
        throw new ForbiddenError("PIN invalido o sin permisos para revertir");
      }
      finalAuthorizedBy = Number(authRows.id);
      authorizerUser = authRows;
    } else if (!finalAuthorizedBy) {
      throw new BadRequestError("authorizedBy es requerido");
    }

    const reversedAt = nowSql();

    await ordersRepository.voidOrderItem(parsedItemId, reason, finalAuthorizedBy);

    let reversalTicket = null;
    if (isSent) {
      const requesterUserId = Number(authorizedBy || 0) || Number(item.waiter_id || 0);
      let requesterName = item.waiter_name || "Mesero";

      if (requesterUserId) {
        const requesterRows = await ordersRepository.findUserById(requesterUserId);
        if (requesterRows) requesterName = requesterRows.full_name;
      }

      reversalTicket = {
        header: "REVERSIÓN DE COMANDA",
        ticketType: "reversal",
        accountId,
        checkNumber: item.check_number,
        tableCode: item.table_code,
        centerId: item.center_id ? Number(item.center_id) : null,
        centerName: item.center_name,
        printerName: item.printer_name,
        reversedAt,
        requestedBy: {
          userId: requesterUserId || null,
          fullName: requesterName,
          role: "waiter",
        },
        authorizedBy: {
          userId: finalAuthorizedBy,
          fullName: authorizerUser?.full_name || "Autorizado",
          role: authorizerUser?.role || "manager",
        },
        item: {
          itemId: parsedItemId,
          productId: Number(item.product_id),
          productName: item.product_name,
          seatNo: Number(item.seat_no || 1),
          qtyReverted: Number(item.qty || 0),
          notes: item.notes || "",
          reason,
        },
      };

      await accountsService.addAccountEvent(
        accountId,
        "reversal_ticket_sent",
        reversalTicket,
        finalAuthorizedBy
      );
    }

    await accountsService.addAccountEvent(
      accountId,
      "item_voided",
      { itemId: parsedItemId, reason, isSent, reversedAt },
      finalAuthorizedBy
    );

    return { ok: true, reversalTicket };
  },
};

module.exports = ordersService;
