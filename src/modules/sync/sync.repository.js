// src/modules/sync/sync.repository.js
// Acceso a datos para ingesta masiva e idempotente de transacciones offline

const { query } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const syncRepository = {
  async findAccountByOfflineId(offlineId, conn = null) {
    if (!offlineId) return null;
    const [rows] = await query(
      `SELECT id, check_number, status, table_id FROM accounts WHERE offline_id = ? LIMIT 1`,
      [offlineId],
      conn
    );
    return rows[0] || null;
  },

  async findAccountByCheckNumber(checkNumber, conn = null) {
    if (!checkNumber) return null;
    const [rows] = await query(
      `SELECT id, check_number, status, table_id FROM accounts WHERE check_number = ? LIMIT 1`,
      [checkNumber],
      conn
    );
    return rows[0] || null;
  },

  async findActiveShift(centerId, conn = null) {
    let sql = `SELECT id, operation_center_id FROM shifts WHERE status = 'open'`;
    const params = [];
    if (centerId) {
      sql += ` AND operation_center_id = ?`;
      params.push(Number(centerId));
    }
    sql += ` ORDER BY opened_at DESC LIMIT 1`;
    const [rows] = await query(sql, params, conn);
    return rows[0] || null;
  },

  async insertOfflineAccount(data, conn = null) {
    const {
      tableId,
      centerId,
      waiterId,
      shiftId,
      customerId,
      status = 'open',
      guestCount = 1,
      checkNumber,
      offlineId,
      terminalCode,
      openedAt,
      closedAt,
    } = data;

    const [result] = await query(
      `INSERT INTO accounts (
        table_id, operation_center_id, waiter_id, shift_id, customer_id,
        status, guest_count, check_number, offline_id, terminal_code,
        is_offline, opened_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        tableId,
        centerId,
        waiterId,
        shiftId,
        customerId || null,
        status,
        guestCount,
        checkNumber,
        offlineId,
        terminalCode || null,
        openedAt || nowSql(),
        closedAt || null,
      ],
      conn
    );

    return result.insertId;
  },

  async updateAccountStatus(accountId, status, closedAt, conn = null) {
    await query(
      `UPDATE accounts SET status = ?, closed_at = ? WHERE id = ?`,
      [status, closedAt || nowSql(), accountId],
      conn
    );
  },

  async insertOfflineOrderItem(data, conn = null) {
    const {
      accountId,
      productId,
      seatNo = 1,
      qty = 1,
      unitPrice,
      lineTotal,
      notes = '',
      offlineId,
      createdAt,
    } = data;

    const [result] = await query(
      `INSERT INTO order_items (
        account_id, product_id, seat_no, qty, unit_price,
        line_total, notes, offline_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        productId,
        seatNo,
        qty,
        unitPrice,
        lineTotal,
        notes,
        offlineId || null,
        createdAt || nowSql(),
      ],
      conn
    );

    return result.insertId;
  },

  async insertOfflinePayment(data, conn = null) {
    const {
      accountId,
      method,
      amount,
      referenceNo = '',
      offlineId,
      felPendingNit,
      felPendingName,
      createdAt,
    } = data;

    const [result] = await query(
      `INSERT INTO account_payments (
        account_id, method, amount, reference_no,
        offline_id, fel_pending_nit, fel_pending_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        method,
        amount,
        referenceNo,
        offlineId || null,
        felPendingNit || null,
        felPendingName || null,
        createdAt || nowSql(),
      ],
      conn
    );

    return result.insertId;
  },

  async logSyncBatch(data, conn = null) {
    const {
      terminalCode,
      terminalSerial,
      accountsCount,
      itemsCount,
      paymentsCount,
      ipAddress,
      status = 'completed',
    } = data;

    const [result] = await query(
      `INSERT INTO sync_batches (
        terminal_code, terminal_serial, accounts_count,
        items_count, payments_count, ip_address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        terminalCode || 'T_UNKNOWN',
        terminalSerial || null,
        accountsCount || 0,
        itemsCount || 0,
        paymentsCount || 0,
        ipAddress || null,
        status,
      ],
      conn
    );

    return result.insertId;
  },
};

module.exports = syncRepository;
