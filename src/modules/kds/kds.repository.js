// src/modules/kds/kds.repository.js
// Consultas SQL directas para el Sistema de Pantallas de Cocina (KDS)

const { query } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const kdsRepository = {
  /**
   * Obtiene los platillos enviados y activos de cuentas abiertas.
   */
  async findActiveOrders(centerId = null) {
    let whereClause = `a.status = 'open' AND oi.status = 'active' AND oi.sent_at IS NOT NULL`;
    const params = [];

    if (centerId) {
      whereClause += ` AND COALESCE(pc.id, pc_ppc.id) = ?`;
      params.push(Number(centerId));
    }

    const [rows] = await query(
      `SELECT 
        oi.id AS item_id,
        oi.qty,
        oi.seat_no,
        oi.notes,
        oi.created_at,
        oi.sent_at,
        oi.completed_at,
        p.name AS product_name,
        COALESCE(pc.id, pc_ppc.id) AS center_id,
        COALESCE(pc.name, pc_ppc.name, 'Cocina') AS center_name,
        a.id AS account_id,
        a.check_number,
        rt.code AS table_code,
        su.full_name AS waiter_name,
        a.guest_count
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       INNER JOIN staff_users su ON su.id = a.waiter_id
       LEFT JOIN matriz_enrutamiento me 
              ON me.area_trabajo_id = rt.area_id 
             AND me.categoria_impresion_id = p.categoria_impresion_id
       LEFT JOIN production_centers pc 
              ON pc.id = COALESCE(oi.production_center_id, p.centro_produccion_exclusivo_id, me.centro_produccion_id)
       LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
       LEFT JOIN production_centers pc_ppc ON pc_ppc.id = ppc.center_id
       WHERE ${whereClause}
       ORDER BY pc.name, oi.sent_at ASC`,
      params
    );
    return rows;
  },

  /**
   * Obtiene modificadores asociados a un conjunto de ítems.
   */
  async findModifiersForItemIds(itemIds = []) {
    if (!itemIds.length) return [];
    const placeholders = itemIds.map(() => "?").join(",");
    const [rows] = await query(
      `SELECT oim.item_id, mo.name 
       FROM order_item_modifiers oim
       INNER JOIN modifier_options mo ON mo.id = oim.option_id
       WHERE oim.item_id IN (${placeholders})`,
      itemIds
    );
    return rows;
  },

  /**
   * Obtiene platillos enviados (activos y anulados) para visualización en pantalla.
   */
  async findOrdersWithVoided(centerId = null) {
    let whereClause = `a.status = 'open' AND oi.sent_at IS NOT NULL AND (oi.status = 'active' OR oi.status = 'void')`;
    const params = [];

    if (centerId) {
      whereClause += ` AND COALESCE(pc.id, pc_ppc.id) = ?`;
      params.push(Number(centerId));
    }

    const [rows] = await query(
      `SELECT 
        oi.id AS item_id,
        oi.qty,
        oi.seat_no,
        oi.notes,
        oi.created_at,
        oi.sent_at,
        oi.status AS item_status,
        oi.void_reason,
        oi.voided_at,
        COALESCE(oi.completed_at, 'null') AS completed_at,
        p.name AS product_name,
        COALESCE(pc.id, pc_ppc.id) AS center_id,
        COALESCE(pc.name, pc_ppc.name, 'Cocina') AS center_name,
        a.id AS account_id,
        a.check_number,
        rt.code AS table_code,
        su.full_name AS waiter_name,
        a.guest_count,
        c.name AS category_name
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       INNER JOIN staff_users su ON su.id = a.waiter_id
       INNER JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN matriz_enrutamiento me 
              ON me.area_trabajo_id = rt.area_id 
             AND me.categoria_impresion_id = p.categoria_impresion_id
       LEFT JOIN production_centers pc 
              ON pc.id = COALESCE(oi.production_center_id, p.centro_produccion_exclusivo_id, me.centro_produccion_id)
       LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
       LEFT JOIN production_centers pc_ppc ON pc_ppc.id = ppc.center_id
       WHERE ${whereClause}
       ORDER BY pc.name, oi.sent_at ASC`,
      params
    );
    return rows;
  },

  /**
   * Busca un ítem de orden por su ID para verificar su estado.
   */
  async findItemById(itemId) {
    const [rows] = await query(
      `SELECT id, account_id, status FROM order_items WHERE id = ?`,
      [Number(itemId)]
    );
    return rows[0] || null;
  },

  /**
   * Marca un ítem individual como completado (listo).
   */
  async markItemDone(itemId, completedAt = nowSql()) {
    await query(
      `UPDATE order_items SET completed_at = ? WHERE id = ?`,
      [completedAt, Number(itemId)]
    );
  },

  /**
   * Marca todos los ítems activos y enviados de una cuenta como completados.
   */
  async markAccountItemsDone(accountId, completedAt = nowSql()) {
    const [result] = await query(
      `UPDATE order_items 
       SET completed_at = ? 
       WHERE account_id = ? AND status = 'active' AND sent_at IS NOT NULL AND completed_at IS NULL`,
      [completedAt, Number(accountId)]
    );
    return result.affectedRows;
  },

  /**
   * Obtiene el historial reciente de ítems completados.
   */
  async findCompletedItems({ centerId = null, limit = 50 }) {
    let whereClause = `a.status = 'open' AND oi.status = 'active' AND oi.completed_at IS NOT NULL`;
    const params = [];

    if (centerId) {
      whereClause += ` AND COALESCE(pc.id, pc_ppc.id) = ?`;
      params.push(Number(centerId));
    }

    params.push(Number(limit) || 50);

    const [rows] = await query(
      `SELECT 
        oi.id AS item_id,
        oi.qty,
        oi.seat_no,
        oi.notes,
        oi.sent_at,
        oi.completed_at,
        p.name AS product_name,
        COALESCE(pc.name, pc_ppc.name, 'Cocina') AS center_name,
        a.id AS account_id,
        a.check_number,
        rt.code AS table_code
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       LEFT JOIN matriz_enrutamiento me 
              ON me.area_trabajo_id = rt.area_id 
             AND me.categoria_impresion_id = p.categoria_impresion_id
       LEFT JOIN production_centers pc 
              ON pc.id = COALESCE(oi.production_center_id, p.centro_produccion_exclusivo_id, me.centro_produccion_id)
       LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
       LEFT JOIN production_centers pc_ppc ON pc_ppc.id = ppc.center_id
       WHERE ${whereClause}
       ORDER BY oi.completed_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  /**
   * Obtiene ítems anulados para la vista de cocina.
   */
  async findVoidedItems({ centerId = null, limit = 20 }) {
    let whereClause = `oi.status = 'void'`;
    const params = [];

    if (centerId) {
      whereClause += ` AND pc.id = ?`;
      params.push(Number(centerId));
    }

    params.push(Number(limit) || 20);

    const [rows] = await query(
      `SELECT 
        oi.id AS item_id,
        oi.qty,
        oi.seat_no,
        oi.notes,
        oi.voided_at,
        oi.void_reason,
        p.name AS product_name,
        pc.name AS center_name,
        a.id AS account_id,
        a.check_number,
        rt.code AS table_code
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
       LEFT JOIN production_centers pc ON pc.id = ppc.center_id
       WHERE ${whereClause}
       ORDER BY oi.voided_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  /**
   * Lista los centros de producción activos.
   */
  async findProductionCenters() {
    const [rows] = await query(
      `SELECT id, name, printer_name, is_active, operation_center_id
       FROM production_centers
       WHERE is_active = 1
       ORDER BY id`
    );
    return rows;
  },

  /**
   * Obtiene datos para el reporte de tiempos de preparación en KDS.
   */
  async findKdsReportItems({ date = null, centerId = null, limit = 100 }) {
    let dateFilter = "";
    const params = [];

    if (date) {
      dateFilter = ` AND DATE(oi.completed_at) = ?`;
      params.push(date);
    }

    let centerFilter = "";
    if (centerId) {
      centerFilter = ` AND COALESCE(pc.id, pc_ppc.id) = ?`;
      params.push(Number(centerId));
    }

    params.push(Number(limit) || 100);

    const [rows] = await query(
      `SELECT
        oi.id AS item_id,
        oi.qty,
        oi.seat_no,
        oi.sent_at,
        oi.completed_at,
        p.name AS product_name,
        c.name AS category_name,
        COALESCE(pc.name, pc_ppc.name, 'Cocina') AS center_name,
        a.id AS account_id,
        rt.code AS table_code,
        su.full_name AS waiter_name,
        TIMESTAMPDIFF(MINUTE, oi.sent_at, oi.completed_at) AS prep_time_minutes
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       INNER JOIN staff_users su ON su.id = a.waiter_id
       INNER JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN matriz_enrutamiento me 
              ON me.area_trabajo_id = rt.area_id 
             AND me.categoria_impresion_id = p.categoria_impresion_id
       LEFT JOIN production_centers pc 
              ON pc.id = COALESCE(oi.production_center_id, p.centro_produccion_exclusivo_id, me.centro_produccion_id)
       LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
       LEFT JOIN production_centers pc_ppc ON pc_ppc.id = ppc.center_id
       WHERE oi.status = 'active'
         AND oi.sent_at IS NOT NULL
         AND oi.completed_at IS NOT NULL
         ${dateFilter}
         ${centerFilter}
       ORDER BY oi.completed_at DESC
       LIMIT ?`,
      params
    );
    return rows;
  },
};

module.exports = kdsRepository;
