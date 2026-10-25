// src/modules/kds/kds.repository.js
// Consultas SQL directas para el Sistema de Pantallas de Cocina (KDS)

const { query } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const kdsRepository = {
  // ─── Control de Módulo Premium en app_settings ───
  async isModuleEnabled() {
    const [rows] = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'module_kds_enabled' LIMIT 1`
    );
    if (!rows.length) return false;
    return String(rows[0].setting_value).trim() === "1";
  },

  async setModuleEnabled(enabled) {
    const val = enabled ? "1" : "0";
    await query(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES ('module_kds_enabled', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [val]
    );
  },

  /**
   * Obtiene los platillos enviados y activos de cuentas abiertas.
   */
  _parseFilters(filters) {
    let productionCenterId = null;
    let operationCenterId = null;

    if (filters && typeof filters === "object") {
      productionCenterId = filters.productionCenterId || filters.centerId || null;
      operationCenterId = filters.operationCenterId || null;
    } else if (filters) {
      productionCenterId = filters;
    }

    return {
      productionCenterId: productionCenterId ? Number(productionCenterId) : null,
      operationCenterId: operationCenterId ? Number(operationCenterId) : null,
    };
  },

  /**
   * Obtiene los platillos enviados y activos de cuentas abiertas con soporte de estación y salón.
   */
  async findActiveOrders(filters = null) {
    const parsed = this._parseFilters(filters);
    let whereClause = `a.status = 'open' AND oi.status = 'active' AND oi.sent_at IS NOT NULL`;
    const params = [];

    if (parsed.productionCenterId) {
      whereClause += ` AND COALESCE(pc.id, pc_ppc.id) = ?`;
      params.push(parsed.productionCenterId);
    }
    if (parsed.operationCenterId) {
      whereClause += ` AND rt.operation_center_id = ?`;
      params.push(parsed.operationCenterId);
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
        rt.operation_center_id,
        oc.name AS operation_center_name,
        su.full_name AS waiter_name,
        a.guest_count
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       LEFT JOIN operation_centers oc ON oc.id = rt.operation_center_id
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
   * Obtiene platillos enviados (activos y anulados) para visualización en pantalla con filtros de estación y salón.
   */
  async findOrdersWithVoided(filters = null) {
    const parsed = this._parseFilters(filters);
    let whereClause = `a.status = 'open' AND oi.sent_at IS NOT NULL AND (oi.status = 'active' OR oi.status = 'void')`;
    const params = [];

    if (parsed.productionCenterId) {
      whereClause += ` AND COALESCE(pc.id, pc_ppc.id) = ?`;
      params.push(parsed.productionCenterId);
    }
    if (parsed.operationCenterId) {
      whereClause += ` AND rt.operation_center_id = ?`;
      params.push(parsed.operationCenterId);
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
        rt.operation_center_id,
        oc.name AS operation_center_name,
        su.full_name AS waiter_name,
        a.guest_count,
        c.name AS category_name
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       LEFT JOIN operation_centers oc ON oc.id = rt.operation_center_id
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
   * Si se especifica productionCenterId, solo despacha los ítems de esa estación.
   */
  async markAccountItemsDone(accountId, completedAt = nowSql(), productionCenterId = null) {
    if (productionCenterId) {
      const [result] = await query(
        `UPDATE order_items oi
         INNER JOIN products p ON p.id = oi.product_id
         LEFT JOIN matriz_enrutamiento me ON me.categoria_impresion_id = p.categoria_impresion_id
         LEFT JOIN production_centers pc 
                ON pc.id = COALESCE(oi.production_center_id, p.centro_produccion_exclusivo_id, me.centro_produccion_id)
         LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
         LEFT JOIN production_centers pc_ppc ON pc_ppc.id = ppc.center_id
         SET oi.completed_at = ?
         WHERE oi.account_id = ? AND oi.status = 'active' AND oi.sent_at IS NOT NULL AND oi.completed_at IS NULL
           AND COALESCE(pc.id, pc_ppc.id) = ?`,
        [completedAt, Number(accountId), Number(productionCenterId)]
      );
      return result.affectedRows;
    }

    const [result] = await query(
      `UPDATE order_items 
       SET completed_at = ? 
       WHERE account_id = ? AND status = 'active' AND sent_at IS NOT NULL AND completed_at IS NULL`,
      [completedAt, Number(accountId)]
    );
    return result.affectedRows;
  },

  /**
   * Obtiene la lista de centros de producción (estaciones: Bar, Cocina, etc.)
   */
  async findProductionCenters() {
    const [rows] = await query(
      `SELECT id, name, is_active FROM production_centers WHERE is_active = 1 ORDER BY name ASC`
    );
    return rows;
  },

  /**
   * Obtiene la lista de centros de consumo (salones: Vaqueros, Flor de Café, ElDeck, etc.)
   */
  async findOperationCenters() {
    const [rows] = await query(
      `SELECT id, name, is_active FROM operation_centers WHERE is_active = 1 ORDER BY name ASC`
    );
    return rows;
  },

  /**
   * Resuelve la estación KDS configurada para un dispositivo/terminal.
   */
  async findTerminalStation({ serial = null, ip = null, terminalId = null } = {}) {
    const conditions = [];
    const params = [];

    if (terminalId) {
      conditions.push("t.id = ?");
      params.push(Number(terminalId));
    }
    if (serial) {
      conditions.push("t.device_serial = ?");
      params.push(String(serial).trim());
    }
    if (ip) {
      conditions.push("t.printer_ip = ?");
      params.push(String(ip).trim());
    }

    if (!conditions.length) return null;

    const [rows] = await query(
      `SELECT t.id, t.name AS terminal_name, t.is_kds, 
              t.kds_production_center_id, t.kds_operation_center_id,
              t.device_serial,
              pc.name AS production_center_name,
              oc.name AS operation_center_name
       FROM terminals t
       LEFT JOIN production_centers pc ON pc.id = t.kds_production_center_id
       LEFT JOIN operation_centers oc ON oc.id = t.kds_operation_center_id
       WHERE (${conditions.join(" OR ")})
       ORDER BY (t.device_serial IS NOT NULL AND t.device_serial = ?) DESC, (t.id = ?) DESC
       LIMIT 1`,
      [...params, String(serial || '').trim(), Number(terminalId) || 0]
    );
    return rows[0] || null;
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
