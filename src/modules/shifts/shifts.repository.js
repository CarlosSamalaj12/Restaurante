// src/modules/shifts/shifts.repository.js
// Consultas SQL directas para el dominio de turnos y corte de caja

const { query } = require("../../common/db");
const { money, nowSql } = require("../../common/utils");

const shiftsRepository = {
  /**
   * Obtiene el turno actualmente abierto para un centro de operación.
   */
  async findActiveShift(centerId) {
    const [rows] = await query(
      `SELECT id, cashier_id, opened_at, opening_cash
       FROM shifts
       WHERE status = 'open' AND operation_center_id = ?
       ORDER BY id DESC LIMIT 1`,
      [Number(centerId)]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene un turno por su ID con el nombre del cajero.
   */
  async findShiftById(shiftId) {
    const [rows] = await query(
      `SELECT s.*, u.full_name AS cashier_name
       FROM shifts s
       LEFT JOIN staff_users u ON u.id = s.cashier_id
       WHERE s.id = ?`,
      [Number(shiftId)]
    );
    return rows[0] || null;
  },

  /**
   * Inserta un nuevo turno abierto.
   */
  async insertShift({ cashierId, centerId, note = "", openingCash = 0, openedAt = nowSql() }) {
    const [result] = await query(
      `INSERT INTO shifts (cashier_id, operation_center_id, opened_at, opening_note, opening_cash, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [Number(cashierId), Number(centerId), openedAt, note, money(Number(openingCash))]
    );
    return result.insertId;
  },

  /**
   * Cierra un turno actualizando su saldo final, fecha y notas.
   */
  async updateShiftClose({ shiftId, cashierId, closedAt = nowSql(), closingNote = "", closingCash = null }) {
    const params = [closedAt, closingNote, cashierId];
    let sql = `UPDATE shifts SET status = 'closed', closed_at = ?, closing_note = ?, cashier_id = ?`;
    if (closingCash !== null && closingCash !== undefined) {
      sql += `, closing_cash = ?`;
      params.push(money(Number(closingCash)));
    }
    params.push(shiftId);
    sql += ` WHERE id = ?`;
    await query(sql, params);
  },

  /**
   * Lista los turnos cerrados para un centro con paginación/límite.
   */
  async findClosedShifts(centerId, limit = 20) {
    const [rows] = await query(
      `SELECT s.id, s.opened_at, s.closed_at, s.opening_cash, s.closing_cash,
              s.closing_note, u.full_name AS cashier_name
       FROM shifts s
       LEFT JOIN staff_users u ON u.id = s.cashier_id
       WHERE s.status = 'closed' AND s.operation_center_id = ?
       ORDER BY s.closed_at DESC
       LIMIT ?`,
      [Number(centerId), Number(limit)]
    );
    return rows;
  },

  /**
   * Consulta agregada de pagos y totales agrupados para el resumen del turno.
   */
  async getShiftPaymentTotals(shiftId) {
    const [rows] = await query(
      `SELECT
        COUNT(a.id) AS total_checks,
        COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END), 0) AS card_total,
        COALESCE(SUM(CASE WHEN p.method = 'transfer' THEN p.amount ELSE 0 END), 0) AS transfer_total,
        COALESCE(SUM(CASE WHEN p.method = 'cxc' THEN p.amount ELSE 0 END), 0) AS cxc_total,
        COALESCE(SUM(CASE WHEN p.method = 'other' THEN p.amount ELSE 0 END), 0) AS other_total,
        COALESCE(SUM(p.amount), 0) AS grand_total
       FROM accounts a
       LEFT JOIN account_payments p ON p.account_id = a.id
       WHERE a.shift_id = ?`,
      [Number(shiftId)]
    );
    return rows[0] || {};
  },

  /**
   * Obtiene los métodos de pago activos para el desglose del reporte.
   */
  async getActivePaymentMethods() {
    const [rows] = await query(
      `SELECT code, label FROM payment_methods WHERE is_active = 1 ORDER BY sort_order`
    );
    return rows;
  },

  /**
   * Obtiene el detalle individual de pagos registrados en el turno.
   */
  async getShiftPaymentsDetail(shiftId) {
    const [rows] = await query(
      `SELECT p.method, p.amount, p.reference_no, a.check_number, a.id AS account_id
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       WHERE a.shift_id = ?
       ORDER BY p.method, a.check_number`,
      [Number(shiftId)]
    );
    return rows;
  },

  /**
   * Obtiene los platillos anulados durante el turno con motivos.
   */
  async getShiftVoidedItems(shiftId) {
    const [rows] = await query(
      `SELECT oi.id, a.check_number, p.name AS product_name, oi.qty, oi.line_total, oi.void_reason, oi.voided_at
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN products p ON p.id = oi.product_id
       WHERE a.shift_id = ? AND oi.status = 'void'
       ORDER BY oi.voided_at`,
      [Number(shiftId)]
    );
    return rows;
  },

  /**
   * Obtiene las cuentas que siguen abiertas vinculadas al turno.
   */
  async getShiftOpenAccounts(shiftId) {
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.guest_count, u.full_name AS waiter_name,
              COALESCE(SUM(oi.line_total), 0) AS total
       FROM accounts a
       LEFT JOIN order_items oi ON oi.account_id = a.id AND oi.status = 'active'
       LEFT JOIN staff_users u ON u.id = a.waiter_id
       WHERE a.shift_id = ? AND a.status = 'open'
       GROUP BY a.id
       ORDER BY a.check_number`,
      [Number(shiftId)]
    );
    return rows;
  },

  /**
   * Obtiene las cuentas pagadas durante el turno con desglose de métodos.
   */
  async getShiftPaidAccounts(shiftId) {
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.guest_count, a.closed_at, u.full_name AS waiter_name,
              COALESCE(SUM(oi.line_total), 0) AS total,
              COALESCE((SELECT GROUP_CONCAT(DISTINCT p.method ORDER BY p.method SEPARATOR ', ') FROM account_payments p WHERE p.account_id = a.id), '') AS payment_methods
       FROM accounts a
       LEFT JOIN order_items oi ON oi.account_id = a.id AND oi.status = 'active'
       LEFT JOIN staff_users u ON u.id = a.waiter_id
       WHERE a.shift_id = ? AND a.status = 'paid'
       GROUP BY a.id
       ORDER BY a.check_number`,
      [Number(shiftId)]
    );
    return rows;
  },
};

module.exports = shiftsRepository;
