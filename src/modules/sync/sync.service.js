// src/modules/sync/sync.service.js
// Lógica de negocio para procesamiento idempotente de lotes de sincronización offline

const syncRepository = require("./sync.repository");
const tablesRepository = require("../tables/tables.repository");
const { withTransaction } = require("../../common/db");
const { emitEvent } = require("../../common/sockets");
const { BadRequestError } = require("../../common/errors");

const syncService = {
  async processBatch({ items = [], terminalCode = "T1", terminalSerial = null, ipAddress = null }) {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: true, processedCount: 0, results: [] };
    }

    const results = [];
    let accountsCount = 0;
    let itemsCount = 0;
    let paymentsCount = 0;

    await withTransaction(async (conn) => {
      // Mapa local de offline_id -> id_servidor para asociar items y pagos a cuentas del mismo lote
      const accountIdMap = new Map();

      for (const queueItem of items) {
        const { id: queueId, action, payload } = queueItem;

        try {
          if (action === "ACCOUNT_OPEN") {
            const {
              offline_id,
              check_number,
              table_id,
              operation_center_id,
              waiter_id,
              guest_count,
              terminal_code,
              opened_at,
            } = payload || {};

            // 1. Idempotencia: Verificar si ya existe
            let existing = await syncRepository.findAccountByOfflineId(offline_id, conn);
            if (!existing && check_number) {
              existing = await syncRepository.findAccountByCheckNumber(check_number, conn);
            }

            if (existing) {
              accountIdMap.set(offline_id, existing.id);
              results.push({ queueId, ok: true, serverId: existing.id, status: "already_synced" });
              continue;
            }

            // 2. Resolver Centro de Operación y Turno Activo
            let centerId = operation_center_id;
            if (!centerId && table_id) {
              const table = await tablesRepository.findById(table_id);
              if (table) centerId = table.operation_center_id;
            }

            const activeShift = await syncRepository.findActiveShift(centerId, conn);
            const shiftId = activeShift ? activeShift.id : null;

            const serverAccountId = await syncRepository.insertOfflineAccount(
              {
                tableId: Number(table_id),
                centerId: Number(centerId) || 1,
                waiterId: Number(waiter_id) || 1,
                shiftId,
                guestCount: Number(guest_count) || 1,
                checkNumber: check_number,
                offlineId: offline_id,
                terminalCode: terminal_code || terminalCode,
                openedAt: opened_at,
              },
              conn
            );

            accountIdMap.set(offline_id, serverAccountId);
            accountsCount++;
            results.push({ queueId, ok: true, serverId: serverAccountId });
          } else if (action === "ORDER_ITEMS_ADD") {
            const { account_offline_id, items: orderItems = [] } = payload || {};

            let serverAccountId = accountIdMap.get(account_offline_id);
            if (!serverAccountId) {
              const acc = await syncRepository.findAccountByOfflineId(account_offline_id, conn);
              if (acc) serverAccountId = acc.id;
            }

            if (!serverAccountId) {
              results.push({
                queueId,
                ok: false,
                error: `No se encontró la cuenta asociada al offline_id: ${account_offline_id}`,
              });
              continue;
            }

            for (const item of orderItems) {
              await syncRepository.insertOfflineOrderItem(
                {
                  accountId: serverAccountId,
                  productId: Number(item.product_id || item.id),
                  seatNo: Number(item.seat_no) || 1,
                  qty: Number(item.qty) || 1,
                  unitPrice: Number(item.unit_price || item.price || 0),
                  lineTotal: Number(item.line_total || (item.qty * (item.unit_price || item.price || 0))),
                  notes: item.notes || "",
                  offlineId: item.offline_id || null,
                  createdAt: item.created_at,
                },
                conn
              );
              itemsCount++;
            }

            results.push({ queueId, ok: true, serverAccountId, itemsInserted: orderItems.length });
          } else if (action === "ACCOUNT_PAY_CLOSE") {
            const { account_offline_id, payment = {} } = payload || {};

            let serverAccountId = accountIdMap.get(account_offline_id);
            if (!serverAccountId) {
              const acc = await syncRepository.findAccountByOfflineId(account_offline_id, conn);
              if (acc) serverAccountId = acc.id;
            }

            if (!serverAccountId) {
              results.push({
                queueId,
                ok: false,
                error: `No se encontró la cuenta para cobro con offline_id: ${account_offline_id}`,
              });
              continue;
            }

            await syncRepository.insertOfflinePayment(
              {
                accountId: serverAccountId,
                method: payment.payment_method || "cash",
                amount: Number(payment.amount) || 0,
                referenceNo: payment.reference_no || "",
                offlineId: payment.offline_id || null,
                felPendingNit: payment.fel_pending_nit || null,
                felPendingName: payment.fel_pending_name || null,
                createdAt: payment.created_at,
              },
              conn
            );

            await syncRepository.updateAccountStatus(serverAccountId, "closed", payment.created_at, conn);
            paymentsCount++;
            results.push({ queueId, ok: true, serverAccountId, paid: true });
          } else {
            results.push({ queueId, ok: true, status: "ignored_unknown_action" });
          }
        } catch (itemErr) {
          console.error(`[SYNC SERVICE] Error procesando item ${queueId}:`, itemErr);
          results.push({ queueId, ok: false, error: itemErr.message });
        }
      }

      // Registrar auditoría de sincronización
      await syncRepository.logSyncBatch(
        {
          terminalCode,
          terminalSerial,
          accountsCount,
          itemsCount,
          paymentsCount,
          ipAddress,
          status: "completed",
        },
        conn
      );
    });

    // Notificar por websockets para refrescar vistas en vivo
    try {
      emitEvent("sync:completed", {
        terminalCode,
        accountsCount,
        itemsCount,
        paymentsCount,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Silencioso si sockets no están conectados
    }

    return {
      success: true,
      processedCount: results.length,
      accountsCount,
      itemsCount,
      paymentsCount,
      results,
    };
  },
};

module.exports = syncService;
