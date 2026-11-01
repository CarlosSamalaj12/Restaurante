// src/modules/settings/operations/operations.repository.js
// Repositorio de consultas SQL puras para Centros de Operación, Terminales, Formas de Pago, Descuentos y Notas de Cocina

const { query } = require("../../../common/db");

const operationsRepository = {
  // ───────── Centros de Operación ─────────
  async createOperationCenter(name) {
    const [inserted] = await query(
      `INSERT INTO operation_centers (name, is_active) VALUES (?, 1)`,
      [name]
    );
    return inserted.insertId;
  },

  async updateOperationCenter(centerId, { name, isActive }) {
    if (isActive !== undefined) {
      await query(
        `UPDATE operation_centers
         SET name = ?, is_active = ?
         WHERE id = ?`,
        [name, Number(isActive) ? 1 : 0, centerId]
      );
    } else {
      await query(
        `UPDATE operation_centers
         SET name = ?
         WHERE id = ?`,
        [name, centerId]
      );
    }
  },

  async hasAccountsInCenter(centerId) {
    const [accounts] = await query(
      `SELECT id FROM accounts WHERE operation_center_id = ? LIMIT 1`,
      [centerId]
    );
    return accounts.length > 0;
  },

  async hasTablesInCenter(centerId) {
    const [tables] = await query(
      `SELECT id FROM restaurant_tables WHERE operation_center_id = ? LIMIT 1`,
      [centerId]
    );
    return tables.length > 0;
  },

  async getCenterUsageDetails(centerId) {
    const [accounts] = await query(
      `SELECT COUNT(*) AS total FROM accounts WHERE operation_center_id = ?`,
      [centerId]
    );
    const [tables] = await query(
      `SELECT COUNT(*) AS total FROM restaurant_tables WHERE operation_center_id = ?`,
      [centerId]
    );
    const [shifts] = await query(
      `SELECT COUNT(*) AS total FROM shifts WHERE operation_center_id = ?`,
      [centerId]
    );
    const [users] = await query(
      `SELECT COUNT(*) AS total FROM staff_users WHERE operation_center_id = ?`,
      [centerId]
    );
    const [terminals] = await query(
      `SELECT COUNT(*) AS total FROM terminals WHERE operation_center_id = ? OR kds_operation_center_id = ?`,
      [centerId, centerId]
    );

    let categoriesCount = 0;
    try {
      const [cats] = await query(
        `SELECT COUNT(*) AS total FROM product_categories WHERE operation_center_id = ?`,
        [centerId]
      );
      categoriesCount = Number(cats?.[0]?.total || 0);
    } catch (_) {}

    let prodCentersCount = 0;
    try {
      const [pcs] = await query(
        `SELECT COUNT(*) AS total FROM production_centers WHERE operation_center_id = ?`,
        [centerId]
      );
      prodCentersCount = Number(pcs?.[0]?.total || 0);
    } catch (_) {}

    const [openShifts] = await query(
      `SELECT COUNT(*) AS total FROM shifts WHERE operation_center_id = ? AND status = 'open'`,
      [centerId]
    );
    const [openAccounts] = await query(
      `SELECT COUNT(*) AS total FROM accounts WHERE operation_center_id = ? AND status = 'open'`,
      [centerId]
    );

    const accountsCount = Number(accounts?.[0]?.total || 0);
    const tablesCount = Number(tables?.[0]?.total || 0);
    const shiftsCount = Number(shifts?.[0]?.total || 0);
    const usersCount = Number(users?.[0]?.total || 0);
    const terminalsCount = Number(terminals?.[0]?.total || 0);
    const openShiftsCount = Number(openShifts?.[0]?.total || 0);
    const openAccountsCount = Number(openAccounts?.[0]?.total || 0);

    const hasLinkedData =
      accountsCount +
        tablesCount +
        shiftsCount +
        usersCount +
        terminalsCount +
        categoriesCount +
        prodCentersCount >
      0;
    const hasActiveOperations = openShiftsCount + openAccountsCount > 0;

    return {
      accountsCount,
      tablesCount,
      shiftsCount,
      usersCount,
      terminalsCount,
      categoriesCount,
      prodCentersCount,
      openShiftsCount,
      openAccountsCount,
      hasLinkedData,
      hasActiveOperations,
    };
  },

  async deleteOperationCenter(centerId) {
    try {
      await query(`DELETE FROM terminal_center_bindings WHERE center_id = ?`, [centerId]);
    } catch (_) {}
    await query(`DELETE FROM operation_center_products WHERE center_id = ?`, [centerId]);
    await query(`DELETE FROM operation_centers WHERE id = ?`, [centerId]);
  },

  async setOperationCenterProducts(centerId, productId, isEnabled) {
    await query(
      `INSERT INTO operation_center_products (center_id, product_id, is_enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
      [centerId, Number(productId), Number(isEnabled) ? 1 : 0]
    );
  },

  async setTerminalCenterBinding(ip, centerId, label) {
    await query(
      `INSERT INTO terminal_center_bindings (ip_address, center_id, label, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE center_id = VALUES(center_id), label = VALUES(label), is_active = 1`,
      [ip, Number(centerId), String(label || "").trim()]
    );
  },

  // ───────── Métodos de Pago ─────────
  async getPaymentMethods(includeInactive = true) {
    const sql = includeInactive
      ? `SELECT code, label, is_active, sort_order, applies_tip FROM payment_methods ORDER BY sort_order ASC, label ASC`
      : `SELECT code, label, is_active, sort_order, applies_tip FROM payment_methods WHERE is_active = 1 ORDER BY sort_order ASC, label ASC`;
    const [rows] = await query(sql);
    return rows || [];
  },

  async savePaymentMethod({ code, label, isActive = 1, sortOrder = 0, appliesTip = 1 }) {
    await query(
      `INSERT INTO payment_methods (code, label, is_active, sort_order, applies_tip)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         is_active = VALUES(is_active),
         sort_order = VALUES(sort_order),
         applies_tip = VALUES(applies_tip)`,
      [code, label, Number(isActive) ? 1 : 0, Number(sortOrder) || 0, Number(appliesTip) ? 1 : 0]
    );
  },

  async hasPaymentsWithMethod(code) {
    const [rows] = await query(`SELECT id FROM account_payments WHERE method = ? LIMIT 1`, [code]);
    return rows.length > 0;
  },

  async deletePaymentMethod(code) {
    await query(`DELETE FROM payment_methods WHERE code = ?`, [code]);
  },

  // ───────── Descuentos / Presets ─────────
  async createDiscountPreset({ name, type, value = 0, isActive = 1, sortOrder = 0 }) {
    await query(
      `INSERT INTO discount_presets (name, type, value, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [name, type, Number(value) || 0, Number(isActive) ? 1 : 0, Number(sortOrder) || 0]
    );
  },

  async updateDiscountPreset(presetId, { name, type, value = 0, isActive = 1, sortOrder = 0 }) {
    await query(
      `UPDATE discount_presets
       SET name = ?, type = ?, value = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [name, type, Number(value) || 0, Number(isActive) ? 1 : 0, Number(sortOrder) || 0, presetId]
    );
  },

  // ───────── Terminales ─────────
  async getTerminalById(id) {
    const [rows] = await query(
      `SELECT id, name AS printer_name, printer_name AS name, printer_ip, printer_port
       FROM terminals WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async createTerminal({
    operationCenterId,
    name,
    printerName = null,
    printerIp = null,
    printerPort = 9100,
    printerId = null,
    areaTrabajoId = null,
    isKds = 0,
    kdsProductionCenterId = null,
    kdsOperationCenterId = null,
    deviceSerial = null,
  }) {
    let resolvedName = printerName;
    let resolvedIp = printerIp;
    let resolvedPort = printerPort;
    if (printerId) {
      const [prn] = await query(`SELECT name, ip, port FROM printers WHERE id = ? LIMIT 1`, [printerId]);
      if (prn?.[0]) {
        resolvedName = prn[0].name;
        resolvedIp = prn[0].ip;
        resolvedPort = prn[0].port;
      }
    }

    const [result] = await query(
      `INSERT INTO terminals (
        operation_center_id, name, printer_name, printer_ip, printer_port, printer_id,
        area_trabajo_id, is_kds, kds_production_center_id, kds_operation_center_id, device_serial
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(operationCenterId),
        name,
        resolvedName || null,
        resolvedIp || null,
        Number(resolvedPort) || 9100,
        printerId ? Number(printerId) : null,
        areaTrabajoId ? Number(areaTrabajoId) : null,
        isKds ? 1 : 0,
        kdsProductionCenterId ? Number(kdsProductionCenterId) : null,
        kdsOperationCenterId ? Number(kdsOperationCenterId) : null,
        deviceSerial ? String(deviceSerial).trim() : null,
      ]
    );
    return result.insertId;
  },

  async updateTerminal(
    terminalId,
    {
      operationCenterId,
      name,
      printerName = null,
      printerIp = null,
      printerPort = 9100,
      printerId = null,
      isActive = 1,
      areaTrabajoId = null,
      isKds = 0,
      kdsProductionCenterId = null,
      kdsOperationCenterId = null,
      deviceSerial = null,
    }
  ) {
    let resolvedName = printerName;
    let resolvedIp = printerIp;
    let resolvedPort = printerPort;
    if (printerId) {
      const [prn] = await query(`SELECT name, ip, port FROM printers WHERE id = ? LIMIT 1`, [printerId]);
      if (prn?.[0]) {
        resolvedName = prn[0].name;
        resolvedIp = prn[0].ip;
        resolvedPort = prn[0].port;
      }
    }

    await query(
      `UPDATE terminals SET 
        operation_center_id = ?, name = ?, printer_name = ?, printer_ip = ?, printer_port = ?, printer_id = ?,
        is_active = ?, area_trabajo_id = ?, is_kds = ?, kds_production_center_id = ?, 
        kds_operation_center_id = ?, device_serial = ? 
       WHERE id = ?`,
      [
        Number(operationCenterId),
        name,
        resolvedName || null,
        resolvedIp || null,
        Number(resolvedPort) || 9100,
        printerId ? Number(printerId) : null,
        Number(isActive) ? 1 : 0,
        areaTrabajoId ? Number(areaTrabajoId) : null,
        isKds ? 1 : 0,
        kdsProductionCenterId ? Number(kdsProductionCenterId) : null,
        kdsOperationCenterId ? Number(kdsOperationCenterId) : null,
        deviceSerial ? String(deviceSerial).trim() : null,
        terminalId,
      ]
    );
  },

  async deleteTerminal(terminalId) {
    await query(`DELETE FROM terminals WHERE id = ?`, [terminalId]);
  },

  async resolveTerminalForUser(userId) {
    if (!userId) return null;
    const [userRows] = await query(
      `SELECT operation_center_id FROM staff_users WHERE id = ? LIMIT 1`,
      [Number(userId)]
    );
    const centerId = userRows?.[0]?.operation_center_id;
    if (!centerId) {
      const [termRows] = await query(
        `SELECT id, name, printer_name, printer_ip, printer_port
         FROM terminals
         WHERE is_active = 1
         ORDER BY id LIMIT 1`
      );
      return termRows?.[0] || null;
    }
    const [termRows] = await query(
      `SELECT id, name, printer_name, printer_ip, printer_port
       FROM terminals
       WHERE operation_center_id = ? AND is_active = 1
       ORDER BY id LIMIT 1`,
      [centerId]
    );
    return termRows?.[0] || null;
  },

  // ───────── Observaciones y Atajos Rápidos de Cocina ─────────
  async getKitchenNotes({ activeOnly = false } = {}) {
    const sql = activeOnly
      ? `SELECT id, label, category, sort_order, is_active, created_at, updated_at FROM kitchen_quick_notes WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
      : `SELECT id, label, category, sort_order, is_active, created_at, updated_at FROM kitchen_quick_notes ORDER BY sort_order ASC, id ASC`;
    const [rows] = await query(sql);
    return rows;
  },

  async createKitchenNote({ label, category = "General", sortOrder = 0, isActive = 1 }) {
    const [res] = await query(
      `INSERT INTO kitchen_quick_notes (label, category, sort_order, is_active) VALUES (?, ?, ?, ?)`,
      [
        String(label).trim(),
        category ? String(category).trim() : "General",
        Number(sortOrder) || 0,
        isActive ? 1 : 0,
      ]
    );
    return {
      id: res.insertId,
      label: String(label).trim(),
      category: category ? String(category).trim() : "General",
      sort_order: Number(sortOrder) || 0,
      is_active: isActive ? 1 : 0,
    };
  },

  async updateKitchenNote(id, { label, category, sortOrder, isActive }) {
    const updates = [];
    const params = [];
    if (label !== undefined) {
      updates.push(`label = ?`);
      params.push(String(label).trim());
    }
    if (category !== undefined) {
      updates.push(`category = ?`);
      params.push(String(category).trim());
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = ?`);
      params.push(Number(sortOrder) || 0);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = ?`);
      params.push(isActive ? 1 : 0);
    }
    if (!updates.length) return;
    params.push(Number(id));
    await query(`UPDATE kitchen_quick_notes SET ${updates.join(", ")} WHERE id = ?`, params);
  },

  async deleteKitchenNote(id) {
    await query(`DELETE FROM kitchen_quick_notes WHERE id = ?`, [Number(id)]);
  },
};

module.exports = operationsRepository;
