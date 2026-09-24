// src/modules/accounts/accounts.service.js
// Lógica de negocio para cuentas, totales, transferencias y divisiones (splits)

const accountsRepository = require("./accounts.repository");
const tablesRepository = require("../tables/tables.repository");
const settingsService = require("../settings/settings.service");
const { withTransaction } = require("../../common/db");
const { money, nowSql } = require("../../common/utils");
const { BadRequestError, NotFoundError } = require("../../common/errors");

const accountsService = {
  /**
   * Calcula los totales de una cuenta (subtotal, descuentos, propina, total, pagado, saldo pendiente).
   */
  async getAccountTotals(accountId, conn = null) {
    const subtotal = await accountsRepository.getSubtotal(accountId, conn);
    const discounts = await accountsRepository.getDiscounts(accountId, conn);

    let discountTotal = 0;
    for (const d of discounts) {
      discountTotal += d.type === "percent" ? subtotal * (Number(d.value) / 100) : Number(d.value);
    }
    discountTotal = Math.min(money(discountTotal), subtotal);

    const { hasOverride, tipPercent: overrideTip } = await accountsRepository.getTipOverride(accountId, conn);
    const globalTipPercent = await settingsService.getTipPercent();
    const tipPercent = hasOverride && !Number.isNaN(overrideTip)
      ? Math.max(0, Math.min(100, overrideTip))
      : globalTipPercent;

    const subtotalAfterDiscount = money(subtotal - discountTotal);
    const tipAmount = money(subtotalAfterDiscount * (tipPercent / 100));
    const paid = await accountsRepository.getTotalPaid(accountId, conn);
    const total = money(subtotalAfterDiscount + tipAmount);
    const pending = money(total - paid);

    return {
      subtotal,
      discountTotal,
      tipPercent,
      tipAmount,
      total,
      paid,
      pending,
      tipIsOverridden: hasOverride,
    };
  },

  /**
   * Registra un evento de auditoría en la cuenta.
   */
  async addAccountEvent(accountId, eventType, payload = {}, createdBy = null, conn = null) {
    await accountsRepository.addEvent(accountId, eventType, payload, createdBy, conn);
  },

  /**
   * Obtiene el detalle completo de una cuenta (ítems, modificadores y totales).
   */
  async getAccountById(accountId) {
    const parsedId = Number(accountId);
    if (!parsedId) throw new BadRequestError("accountId inválido");

    const account = await accountsRepository.findById(parsedId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");

    const items = await accountsRepository.findOrderItems(parsedId);
    const itemIds = items.map((x) => x.id);
    const itemMods = await accountsRepository.findOrderItemModifiers(itemIds);

    const enrichedItems = items.map((i) => ({
      ...i,
      modifiers: itemMods[i.id] || [],
    }));

    const totals = await this.getAccountTotals(parsedId);
    return {
      account,
      items: enrichedItems,
      totals,
    };
  },

  /**
   * Obtiene la cuenta por su número de check.
   */
  async getAccountByCheck(checkNumber) {
    const check = String(checkNumber || "").trim();
    if (!check) throw new BadRequestError("checkNumber es requerido");

    const row = await accountsRepository.findByCheckNumber(check);
    if (!row) throw new NotFoundError("Cuenta no encontrada para ese check");

    return row;
  },

  /**
   * Obtiene las cuentas abiertas de una mesa con sus totales calculados.
   */
  async getTableAccounts(tableId) {
    const parsedTableId = Number(tableId);
    if (!parsedTableId) throw new BadRequestError("tableId es requerido");

    const rows = await accountsRepository.findOpenAccountsByTableId(parsedTableId);
    const enriched = [];
    for (const row of rows) {
      const totals = await this.getAccountTotals(row.id);
      enriched.push({ ...row, totals });
    }
    return enriched;
  },

  /**
   * Lista todas las cuentas abiertas (opcionalmente filtradas por centro de operación)
   * incluyendo los primeros 5 platillos de cada una.
   */
  async getOpenAccounts(centerId = 0) {
    const rows = await accountsRepository.findOpenAccounts(centerId);
    const accountIds = rows.map((r) => Number(r.id));

    if (accountIds.length > 0) {
      const itemsMap = await accountsRepository.findTopItemsByAccountIds(accountIds, 5);
      rows.forEach((r) => {
        r.items = itemsMap[r.id] || [];
      });
    } else {
      rows.forEach((r) => {
        r.items = [];
      });
    }
    return rows;
  },

  /**
   * Busca cuentas pagadas con filtros opcionales de texto y rango de fechas.
   */
  async searchPaidAccounts({ centerId, q, startDate, endDate }) {
    if (!centerId) throw new BadRequestError("centerId es requerido");
    return accountsRepository.searchPaidAccounts({ centerId, q, startDate, endDate });
  },

  /**
   * Obtiene los datos de precuenta para impresión o vista previa.
   */
  async getAccountPrecheck(accountId) {
    const parsedId = Number(accountId);
    if (!parsedId) throw new BadRequestError("accountId inválido");

    const account = await accountsRepository.findDetailsForReceipt(parsedId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");

    const items = await accountsRepository.findOrderItems(parsedId);
    return { account, items };
  },

  /**
   * Obtiene los datos completos para reimpresión de recibo (cuenta, items, pagos y totales).
   */
  async getAccountReceipt(accountId) {
    const parsedId = Number(accountId);
    if (!parsedId) throw new BadRequestError("accountId inválido");

    const account = await accountsRepository.findDetailsForReceipt(parsedId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");

    const items = await accountsRepository.findOrderItems(parsedId);
    const payments = await accountsRepository.findPayments(parsedId);
    const totals = await this.getAccountTotals(parsedId);

    return { account, items, payments, totals };
  },

  /**
   * Crea una nueva cuenta para una mesa.
   */
  async createAccount({ tableId, waiterId, guestCount = 1, customerId = null, centerId = null }) {
    const parsedTableId = Number(tableId);
    const parsedWaiterId = Number(waiterId);

    if (!parsedTableId || !parsedWaiterId) {
      throw new BadRequestError("tableId y waiterId son requeridos");
    }

    const table = await tablesRepository.findById(parsedTableId);
    if (!table) throw new NotFoundError("Mesa no encontrada");

    const finalCenterId = Number(centerId || table.operation_center_id || 0);
    const openShift = await accountsRepository.findOpenShift(finalCenterId);
    const shiftId = openShift ? openShift.id : null;

    const tempCheckNumber = `TMP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    return withTransaction(async (conn) => {
      const accountId = await accountsRepository.createAccountRecord(
        {
          tableId: parsedTableId,
          centerId: finalCenterId,
          waiterId: parsedWaiterId,
          shiftId,
          customerId,
          guestCount: Number(guestCount) || 1,
          tempCheckNumber,
        },
        conn
      );

      const checkNumber = `CHK-${String(Number(accountId)).padStart(4, "0")}`;
      await accountsRepository.updateCheckNumber(accountId, checkNumber, conn);
      await accountsRepository.addEvent(
        accountId,
        "account_opened",
        { guestCount: Number(guestCount) || 1 },
        parsedWaiterId,
        conn
      );

      return { id: accountId, accountId, checkNumber, check_number: checkNumber };
    });
  },

  /**
   * Elimina una cuenta vacía sin consumo ni pagos.
   */
  async deleteAccount(accountId) {
    const parsedId = Number(accountId);
    if (!parsedId) throw new BadRequestError("accountId inválido");

    const account = await accountsRepository.findById(parsedId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");

    if (String(account.status) !== "open") {
      throw new BadRequestError("Solo puedes eliminar cuentas abiertas");
    }

    const activityCount = await accountsRepository.countActivity(parsedId);
    if (activityCount > 0) {
      throw new BadRequestError("Solo puedes eliminar cuentas vacias");
    }

    await withTransaction(async (conn) => {
      await accountsRepository.deleteAccountCascade(parsedId, conn);
    });

    return { ok: true };
  },

  /**
   * Desactiva la propina fijándola en 0%.
   */
  async removeTip(accountId) {
    const parsedId = Number(accountId);
    if (!parsedId) throw new BadRequestError("accountId inválido");

    const account = await accountsRepository.findById(parsedId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");
    if (String(account.status) !== "open") {
      throw new BadRequestError("Solo cuentas abiertas permiten quitar propina");
    }

    await accountsRepository.setTipOverride(parsedId, 0);
    const totals = await this.getAccountTotals(parsedId);
    await accountsRepository.addEvent(parsedId, "tip_removed", { tipPercent: 0 }, null);

    return { ok: true, totals };
  },

  /**
   * Restaura la propina al porcentaje global configurado.
   */
  async restoreTip(accountId) {
    const parsedId = Number(accountId);
    if (!parsedId) throw new BadRequestError("accountId inválido");

    const account = await accountsRepository.findById(parsedId);
    if (!account) throw new NotFoundError("Cuenta no encontrada");
    if (String(account.status) !== "open") {
      throw new BadRequestError("Solo cuentas abiertas permiten restaurar propina");
    }

    await accountsRepository.setTipOverride(parsedId, null);
    const totals = await this.getAccountTotals(parsedId);
    await accountsRepository.addEvent(parsedId, "tip_restored", { tipPercent: totals.tipPercent }, null);

    return { ok: true, totals };
  },

  /**
   * Transfiere todos los productos de un asiento a otra cuenta.
   */
  async transferSeat({ accountId, seatNo, toAccountId }) {
    const fromId = Number(accountId);
    const toId = Number(toAccountId);
    const seat = Number(seatNo);

    if (!fromId || !toId || !seat) {
      throw new BadRequestError("seatNo y toAccountId son requeridos");
    }

    return withTransaction(async (conn) => {
      await accountsRepository.transferSeat(fromId, toId, seat, conn);
      await accountsRepository.addEvent(fromId, "seat_transferred_out", { seatNo: seat, toAccountId: toId }, null, conn);
      await accountsRepository.addEvent(toId, "seat_transferred_in", { seatNo: seat, fromAccountId: fromId }, null, conn);
      return { ok: true };
    });
  },

  /**
   * Mueve un ítem (total o parcialmente) de una cuenta a otra dentro de la misma mesa.
   */
  async moveItem({ fromAccountId, itemId, toAccountId, qty = null }) {
    const parsedFrom = Number(fromAccountId);
    const parsedItem = Number(itemId);
    const parsedTo = Number(toAccountId);

    if (!parsedFrom || !parsedItem || !parsedTo) {
      throw new BadRequestError("accountId, itemId y toAccountId son requeridos");
    }

    return withTransaction(async (conn) => {
      const fromRows = await accountsRepository.findById(parsedFrom, conn);
      const toRows = await accountsRepository.findById(parsedTo, conn);

      if (!fromRows || !toRows) {
        throw new NotFoundError("Cuenta origen o destino no encontrada");
      }
      if (Number(fromRows.table_id) !== Number(toRows.table_id)) {
        throw new BadRequestError("Solo puedes mover entre cuentas de la misma mesa");
      }
      if (String(fromRows.status) !== "open" || String(toRows.status) !== "open") {
        throw new BadRequestError("Solo cuentas abiertas permiten mover productos");
      }

      const src = await accountsRepository.findItemById(parsedItem, parsedFrom, conn);
      if (!src) {
        throw new NotFoundError("Platillo no encontrado en la cuenta origen");
      }

      const currentQty = Number(src.qty || 0);
      const moveQtyRaw = qty === null || qty === undefined || qty === "" ? currentQty : Number(qty);
      const moveQty = Number(moveQtyRaw.toFixed(2));

      if (Number.isNaN(moveQty) || moveQty <= 0 || moveQty > currentQty) {
        throw new BadRequestError("Cantidad a mover invalida");
      }

      const mods = await accountsRepository.findModifiersForItem(parsedItem, conn);

      // Movimiento completo
      if (moveQty >= currentQty - 0.0001) {
        await accountsRepository.reassignItemAccount(parsedItem, parsedTo, conn);
        await accountsRepository.addEvent(
          parsedFrom,
          "item_moved_out",
          { itemId: parsedItem, toAccountId: parsedTo, qty: moveQty },
          null,
          conn
        );
        await accountsRepository.addEvent(
          parsedTo,
          "item_moved_in",
          { itemId: parsedItem, fromAccountId: parsedFrom, qty: moveQty },
          null,
          conn
        );
        return { ok: true, movedQty: moveQty, partial: false };
      }

      // Movimiento parcial: reduce origen e inserta nuevo ítem en destino
      const remainingQty = Number((currentQty - moveQty).toFixed(2));
      await accountsRepository.updateItemQtyAndTotal(
        parsedItem,
        remainingQty,
        money(Number(src.unit_price) * remainingQty),
        conn
      );

      const newItemId = await accountsRepository.insertOrderItem(
        {
          accountId: parsedTo,
          productId: Number(src.product_id),
          seatNo: Number(src.seat_no || 1),
          qty: moveQty,
          unitPrice: Number(src.unit_price),
          lineTotal: money(Number(src.unit_price) * moveQty),
          notes: src.notes || "",
          sentAt: src.sent_at || null,
        },
        conn
      );

      if (mods.length > 0) {
        await accountsRepository.insertOrderItemModifiers(newItemId, mods, conn);
      }

      await accountsRepository.addEvent(
        parsedFrom,
        "item_moved_out",
        { itemId: parsedItem, toAccountId: parsedTo, qty: moveQty },
        null,
        conn
      );
      await accountsRepository.addEvent(
        parsedTo,
        "item_moved_in",
        { itemId: newItemId, fromAccountId: parsedFrom, qty: moveQty },
        null,
        conn
      );

      return { ok: true, movedQty: moveQty, partial: true, newItemId };
    });
  },

  /**
   * Divide en partes iguales el consumo de la cuenta origen entre un grupo de cuentas.
   */
  async splitEqual({ accountId, targetAccountIds }) {
    const sourceAccountId = Number(accountId);
    const targetIdsRaw = Array.isArray(targetAccountIds) ? targetAccountIds : [];

    if (!sourceAccountId || !targetIdsRaw.length) {
      throw new BadRequestError("accountId y targetAccountIds son requeridos");
    }

    const targets = [...new Set(targetIdsRaw.map((x) => Number(x || 0)).filter((x) => x > 0))];
    if (!targets.includes(sourceAccountId)) targets.unshift(sourceAccountId);

    if (targets.length < 2) {
      throw new BadRequestError("Se requieren al menos 2 cuentas para compartir");
    }

    return withTransaction(async (conn) => {
      const source = await accountsRepository.findById(sourceAccountId, conn);
      if (!source) throw new NotFoundError("Cuenta origen no encontrada");
      if (String(source.status) !== "open") throw new BadRequestError("Cuenta origen no esta abierta");

      const tableId = Number(source.table_id);

      for (const tId of targets) {
        const acc = await accountsRepository.findById(tId, conn);
        if (!acc || Number(acc.table_id) !== tableId || String(acc.status) !== "open") {
          throw new BadRequestError("Todas las cuentas destino deben ser abiertas y de la misma mesa");
        }
      }

      const items = await accountsRepository.findOrderItems(sourceAccountId, conn);
      if (!items.length) {
        throw new BadRequestError("No hay platillos activos para compartir");
      }

      for (const item of items) {
        const totalQty = Number(item.qty || 0);
        if (totalQty <= 0) continue;
        const n = targets.length;
        const perQty = Number((totalQty / n).toFixed(2));
        let consumed = 0;

        for (let idx = 0; idx < n; idx += 1) {
          const targetId = targets[idx];
          let splitQty = idx === n - 1 ? Number((totalQty - consumed).toFixed(2)) : perQty;
          splitQty = Number(splitQty.toFixed(2));
          if (splitQty <= 0) continue;
          consumed = Number((consumed + splitQty).toFixed(2));

          if (targetId === sourceAccountId) {
            await accountsRepository.updateItemQtyAndTotal(
              item.id,
              splitQty,
              money(Number(item.unit_price) * splitQty),
              conn
            );
          } else {
            const newItemId = await accountsRepository.insertOrderItem(
              {
                accountId: targetId,
                productId: Number(item.product_id),
                seatNo: Number(item.seat_no || 1),
                qty: splitQty,
                unitPrice: Number(item.unit_price),
                lineTotal: money(Number(item.unit_price) * splitQty),
                notes: item.notes || "",
                sentAt: item.sent_at || null,
              },
              conn
            );

            const mods = await accountsRepository.findModifiersForItem(item.id, conn);
            if (mods.length > 0) {
              await accountsRepository.insertOrderItemModifiers(newItemId, mods, conn);
            }
          }
        }
      }

      await accountsRepository.addEvent(sourceAccountId, "items_shared_equal", { targetAccountIds: targets }, null, conn);
      return { ok: true, targets: targets.length };
    });
  },

  /**
   * Crea N cuentas nuevas y transfiere los ítems seleccionados a cada una.
   */
  async splitCustom({ accountId, splits }) {
    const sourceAccountId = Number(accountId);
    if (!sourceAccountId || !Array.isArray(splits) || splits.length < 2) {
      throw new BadRequestError("Se requieren al menos 2 cuentas para dividir");
    }

    const allItemIds = splits.flatMap((s) => (s.itemIds || []).map((id) => Number(id)));
    if (allItemIds.length === 0) {
      throw new BadRequestError("Debes asignar al menos un producto a las cuentas");
    }

    return withTransaction(async (conn) => {
      const src = await accountsRepository.findById(sourceAccountId, conn);
      if (!src) throw new NotFoundError("Cuenta origen no encontrada");
      if (String(src.status) !== "open") throw new BadRequestError("Cuenta origen no está abierta");

      const { table_id, waiter_id, operation_center_id } = src;
      const openShift = await accountsRepository.findOpenShift(operation_center_id, conn);
      const shiftId = openShift ? openShift.id : null;

      const results = [];

      for (const split of splits) {
        const itemIds = (split.itemIds || []).map((id) => Number(id));
        if (itemIds.length === 0) continue;

        const tempCheckNumber = `TMP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`;

        const newAccountId = await accountsRepository.createAccountRecord(
          {
            tableId: table_id,
            centerId: operation_center_id,
            waiterId: waiter_id,
            shiftId,
            customerId: null,
            guestCount: 1,
            tempCheckNumber,
          },
          conn
        );

        const checkNumber = `CHK-${String(newAccountId).padStart(4, "0")}`;
        await accountsRepository.updateCheckNumber(newAccountId, checkNumber, conn);

        for (const iId of itemIds) {
          await accountsRepository.reassignItemAccount(iId, newAccountId, conn);
        }

        await accountsRepository.addEvent(
          newAccountId,
          "account_opened",
          { source: sourceAccountId, split: true },
          waiter_id,
          conn
        );
        await accountsRepository.addEvent(
          sourceAccountId,
          "items_split_out",
          { toAccountId: newAccountId, count: itemIds.length },
          null,
          conn
        );

        results.push({
          accountId: newAccountId,
          checkNumber,
          name: split.name || `Cuenta ${results.length + 1}`,
          itemIds,
        });
      }

      return { ok: true, splits: results };
    });
  },

  /**
   * Divide el consumo de la cuenta en N personas idénticas creando N cuentas hijas
   * con fracciones 1/N de cada platillo y cerrando la cuenta matriz con status 'shared_split'.
   */
  async splitShared({ accountId, peopleCount }) {
    const sourceAccountId = Number(accountId);
    const count = Number(peopleCount);

    if (!sourceAccountId || !count || count < 2) {
      throw new BadRequestError("peopleCount debe ser al menos 2");
    }

    return withTransaction(async (conn) => {
      const src = await accountsRepository.findById(sourceAccountId, conn);
      if (!src) throw new NotFoundError("Cuenta origen no encontrada");
      if (String(src.status) !== "open") throw new BadRequestError("Cuenta origen no está abierta");

      const items = await accountsRepository.findOrderItems(sourceAccountId, conn);
      if (!items.length) throw new BadRequestError("La cuenta no tiene productos");

      const { table_id, waiter_id, operation_center_id } = src;
      const openShift = await accountsRepository.findOpenShift(operation_center_id, conn);
      const shiftId = openShift ? openShift.id : null;
      const fractionalQty = 1 / count;
      const results = [];

      for (let i = 0; i < count; i++) {
        const tempCheckNumber = `TMP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0")}`;

        const newAccountId = await accountsRepository.createAccountRecord(
          {
            tableId: table_id,
            centerId: operation_center_id,
            waiterId: waiter_id,
            shiftId,
            customerId: null,
            guestCount: 1,
            tempCheckNumber,
          },
          conn
        );

        const checkNumber = `CHK-${String(newAccountId).padStart(4, "0")}`;
        await accountsRepository.updateCheckNumber(newAccountId, checkNumber, conn);

        for (const item of items) {
          const unitPrice = Number(item.unit_price) || 0;
          const fractionalTotal = Number((unitPrice * fractionalQty).toFixed(2));

          await accountsRepository.insertOrderItem(
            {
              accountId: newAccountId,
              productId: Number(item.product_id),
              seatNo: Number(item.seat_no || 1),
              qty: fractionalQty,
              unitPrice,
              lineTotal: fractionalTotal,
              notes: item.notes || "",
              sentAt: item.sent_at || null,
            },
            conn
          );
        }

        await accountsRepository.addEvent(
          newAccountId,
          "account_opened",
          { source: sourceAccountId, shared: true, peopleCount: count },
          waiter_id,
          conn
        );

        results.push({
          accountId: newAccountId,
          checkNumber,
          name: `Persona ${i + 1}`,
        });
      }

      await accountsRepository.closeAccountWithStatus(sourceAccountId, "shared_split", null, conn);
      await accountsRepository.addEvent(
        sourceAccountId,
        "account_shared",
        { peopleCount: count, newAccounts: results.length },
        null,
        conn
      );

      return { ok: true, peopleCount: count, accounts: results };
    });
  },

  /**
   * Transfiere todos los productos de una cuenta origen a una cuenta destino y cancela la cuenta origen.
   */
  async transferAccount({ sourceAccountId, targetAccountId }) {
    const srcId = Number(sourceAccountId);
    const tgtId = Number(targetAccountId);

    if (!srcId || !tgtId) {
      throw new BadRequestError("sourceAccountId y targetAccountId son requeridos");
    }
    if (srcId === tgtId) {
      throw new BadRequestError("No puedes transferir a la misma cuenta");
    }

    return withTransaction(async (conn) => {
      const src = await accountsRepository.findById(srcId, conn);
      const tgt = await accountsRepository.findById(tgtId, conn);

      if (!src) throw new NotFoundError("Cuenta origen no encontrada");
      if (!tgt) throw new NotFoundError("Cuenta destino no encontrada");

      if (String(src.status) !== "open") throw new BadRequestError("Solo cuentas abiertas pueden transferirse");
      if (String(tgt.status) !== "open") throw new BadRequestError("La cuenta destino debe estar abierta");

      const transferredCount = await accountsRepository.transferAllItems(srcId, tgtId, conn);
      await accountsRepository.closeAccountWithStatus(srcId, "void", null, conn);

      await accountsRepository.addEvent(srcId, "transferred_to", { targetAccountId: tgtId }, null, conn);
      await accountsRepository.addEvent(tgtId, "received_transfer_from", { sourceAccountId: srcId }, null, conn);

      return { ok: true, transferredItems: transferredCount };
    });
  },

  /**
   * Une dos cuentas combinando todos los productos en la cuenta objetivo.
   */
  async joinAccounts({ targetAccountId, sourceAccountId }) {
    const tgtId = Number(targetAccountId);
    const srcId = Number(sourceAccountId);

    if (!tgtId || !srcId) {
      throw new BadRequestError("targetAccountId y sourceAccountId son requeridos");
    }
    if (tgtId === srcId) {
      throw new BadRequestError("No puedes unir una cuenta consigo misma");
    }

    return withTransaction(async (conn) => {
      const tgt = await accountsRepository.findById(tgtId, conn);
      const src = await accountsRepository.findById(srcId, conn);

      if (!tgt) throw new NotFoundError("Cuenta destino no encontrada");
      if (!src) throw new NotFoundError("Cuenta origen no encontrada");

      if (String(tgt.status) !== "open") throw new BadRequestError("La cuenta destino debe estar abierta");
      if (String(src.status) !== "open") throw new BadRequestError("La cuenta origen debe estar abierta");

      const joinedCount = await accountsRepository.transferAllItems(srcId, tgtId, conn);
      await accountsRepository.closeAccountWithStatus(srcId, "void", tgtId, conn);

      await accountsRepository.addEvent(srcId, "joined_with", { targetAccountId: tgtId }, null, conn);
      await accountsRepository.addEvent(tgtId, "joined_with", { sourceAccountId: srcId }, null, conn);

      return { ok: true, joinedItems: joinedCount };
    });
  },
};

module.exports = accountsService;
