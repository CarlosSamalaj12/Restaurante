// src/modules/tables/tables.repository.js
// Capa de acceso a datos para mesas (restaurant_tables) y áreas (dining_areas)

const { query } = require("../../common/db");

const tablesRepository = {
  /**
   * Obtiene la lista de mesas activas con estadísticas de cuentas abiertas y consumo.
   */
  async getTablesWithActivity(centerId = 0, conn = null) {
    const [rows] = await query(
      `SELECT
        t.id, t.code, t.seats, a.name AS area_name, t.operation_center_id,
        (SELECT COUNT(*) FROM accounts WHERE table_id = t.id AND status = 'open') AS open_accounts,
        (SELECT MAX(oi.created_at) FROM accounts ac JOIN order_items oi ON oi.account_id = ac.id AND oi.status = 'active' WHERE ac.table_id = t.id AND ac.status = 'open') AS last_activity_at,
        (SELECT COALESCE(SUM(oi.line_total), 0) FROM accounts ac JOIN order_items oi ON oi.account_id = ac.id AND oi.status = 'active' WHERE ac.table_id = t.id AND ac.status = 'open') AS total,
        (SELECT u.full_name FROM accounts ac JOIN staff_users u ON u.id = ac.waiter_id WHERE ac.table_id = t.id AND ac.status = 'open' ORDER BY ac.opened_at DESC LIMIT 1) AS waiter_name
       FROM restaurant_tables t
       INNER JOIN dining_areas a ON a.id = t.area_id
       WHERE t.is_active = 1 AND (? = 0 OR t.operation_center_id = ?)
       ORDER BY a.name, t.code`,
      [Number(centerId) || 0, Number(centerId) || 0],
      conn
    );
    return rows;
  },

  /**
   * Busca una mesa por su ID.
   */
  async findById(tableId, conn = null) {
    const [rows] = await query(
      `SELECT t.*, a.name AS area_name
       FROM restaurant_tables t
       LEFT JOIN dining_areas a ON a.id = t.area_id
       WHERE t.id = ?
       LIMIT 1`,
      [Number(tableId)],
      conn
    );
    return rows[0] || null;
  },

  /**
   * Obtiene el ID de la primera área disponible en el sistema.
   */
  async getFirstAreaId(conn = null) {
    const [areas] = await query(`SELECT id FROM dining_areas LIMIT 1`, [], conn);
    return areas.length > 0 ? areas[0].id : 1;
  },

  /**
   * Inserta una nueva mesa.
   */
  async createTable({ areaId, centerId, code, seats = 4, isActive = 1 }, conn = null) {
    const [result] = await query(
      `INSERT INTO restaurant_tables (area_id, operation_center_id, code, seats, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(areaId), Number(centerId), String(code).trim(), Number(seats) || 4, Number(isActive) ? 1 : 0],
      conn
    );
    return result.insertId;
  },

  /**
   * Actualiza los datos de una mesa existente.
   */
  async updateTable(tableId, { areaId, centerId, code, seats = 4, isActive = 1 }, conn = null) {
    const [result] = await query(
      `UPDATE restaurant_tables
       SET area_id = ?, operation_center_id = ?, code = ?, seats = ?, is_active = ?
       WHERE id = ?`,
      [Number(areaId), Number(centerId), String(code).trim(), Number(seats) || 4, Number(isActive) ? 1 : 0, Number(tableId)],
      conn
    );
    return result.affectedRows > 0;
  },

  /**
   * Verifica cuántas cuentas tiene asociadas una mesa.
   */
  async countAccounts(tableId, conn = null) {
    const [rows] = await query(`SELECT COUNT(*) AS c FROM accounts WHERE table_id = ?`, [Number(tableId)], conn);
    return Number(rows[0]?.c || 0);
  },

  /**
   * Desvincula y elimina una mesa.
   */
  async deleteTable(tableId, conn = null) {
    await query(`UPDATE accounts SET table_id = NULL WHERE table_id = ?`, [Number(tableId)], conn);
    const [result] = await query(`DELETE FROM restaurant_tables WHERE id = ?`, [Number(tableId)], conn);
    return result.affectedRows > 0;
  },

  /**
   * Crea un área de comedor.
   */
  async createArea({ name, isActive = 1, sortOrder = 0 }, conn = null) {
    const [result] = await query(
      `INSERT INTO dining_areas (name, is_active, sort_order)
       VALUES (?, ?, ?)`,
      [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0],
      conn
    );
    return result.insertId;
  },

  /**
   * Actualiza un área de comedor.
   */
  async updateArea(areaId, { name, isActive = 1, sortOrder = 0 }, conn = null) {
    const [result] = await query(
      `UPDATE dining_areas
       SET name = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, Number(areaId)],
      conn
    );
    return result.affectedRows > 0;
  },
};

module.exports = tablesRepository;
