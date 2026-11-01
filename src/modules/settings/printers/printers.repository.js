// src/modules/settings/printers/printers.repository.js
// Repositorio de consultas SQL puras para Impresoras, Centros de Producción, Matriz de Ruteo y Categorías

const { query } = require("../../../common/db");

const printersRepository = {
  // App Settings helper (para modo de ruteo)
  async getAppSetting(key) {
    const [rows] = await query(`SELECT value FROM app_settings WHERE \`key\` = ? LIMIT 1`, [key]);
    return rows?.[0]?.value || null;
  },

  async setAppSetting(key, val) {
    await query(
      `INSERT INTO app_settings (\`key\`, value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [key, String(val)]
    );
  },

  // Terminal helper (para pruebas de impresión a terminales)
  async getTerminalById(id) {
    const [rows] = await query(
      `SELECT id, name AS printer_name, printer_name AS name, printer_ip, printer_port
       FROM terminals WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  // ───────── Production Centers ─────────
  async getProductionCenters() {
    const [centers] = await query(
      `SELECT id, name, printer_name, printer_ip, printer_port, is_active, operation_center_id
       FROM production_centers
       ORDER BY id`
    );
    return centers;
  },

  async getProductionCenterById(id) {
    const [rows] = await query(
      `SELECT id, name AS printer_name, printer_name AS name, printer_ip, printer_port
       FROM production_centers WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async createProductionCenter({
    name,
    printerName = "",
    printerIp = "",
    printerPort = 9100,
    printerId = null,
    isActive = 1,
    operationCenterId = null,
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
      `INSERT INTO production_centers (name, printer_name, printer_ip, printer_port, printer_id, is_active, operation_center_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        resolvedName,
        resolvedIp || null,
        Number(resolvedPort) || 9100,
        printerId ? Number(printerId) : null,
        Number(isActive) ? 1 : 0,
        operationCenterId ? Number(operationCenterId) : null,
      ]
    );
    return result.insertId;
  },

  async updateProductionCenter(
    centerId,
    {
      name,
      printerName = "",
      printerIp = "",
      printerPort = 9100,
      printerId = null,
      isActive = 1,
      operationCenterId = null,
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
      `UPDATE production_centers
       SET name = ?, printer_name = ?, printer_ip = ?, printer_port = ?, printer_id = ?, is_active = ?, operation_center_id = ?
       WHERE id = ?`,
      [
        name,
        resolvedName,
        resolvedIp || null,
        Number(resolvedPort) || 9100,
        printerId ? Number(printerId) : null,
        Number(isActive) ? 1 : 0,
        operationCenterId ? Number(operationCenterId) : null,
        centerId,
      ]
    );
  },

  async countProductsInProductionCenter(centerId) {
    const [usage] = await query(
      `SELECT COUNT(*) as cnt FROM product_production_centers WHERE center_id = ?`,
      [centerId]
    );
    return Number(usage[0]?.cnt || 0);
  },

  async deleteProductionCenter(centerId) {
    await query(`DELETE FROM production_centers WHERE id = ?`, [centerId]);
  },

  // ───────── Catálogo Central de Impresoras ─────────
  async getPrinters() {
    const [rows] = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM production_centers pc WHERE pc.printer_id = p.id OR (pc.printer_id IS NULL AND pc.printer_ip = p.ip)) AS production_centers_count,
        (SELECT COUNT(*) FROM terminals t WHERE t.printer_id = p.id OR (t.printer_id IS NULL AND t.printer_ip = p.ip)) AS terminals_count
      FROM printers p
      ORDER BY p.name ASC
    `);
    return rows;
  },

  async getPrinterById(id) {
    const [rows] = await query(`SELECT * FROM printers WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async createPrinter({
    name,
    ip,
    port = 9100,
    type = "production",
    paperWidth = "80mm",
    isActive = 1,
    description = null,
  }) {
    const [result] = await query(
      `INSERT INTO printers (name, ip, port, type, paper_width, is_active, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        String(ip).trim(),
        Number(port) || 9100,
        ["production", "receipt", "both"].includes(type) ? type : "production",
        paperWidth === "58mm" ? "58mm" : "80mm",
        Number(isActive) ? 1 : 0,
        description ? String(description).trim() : null,
      ]
    );
    return result.insertId;
  },

  async updatePrinter(
    id,
    {
      name,
      ip,
      port = 9100,
      type = "production",
      paperWidth = "80mm",
      isActive = 1,
      description = null,
    }
  ) {
    const cleanName = String(name).trim();
    const cleanIp = String(ip).trim();
    const cleanPort = Number(port) || 9100;
    const cleanType = ["production", "receipt", "both"].includes(type) ? type : "production";
    const cleanWidth = paperWidth === "58mm" ? "58mm" : "80mm";
    const cleanActive = Number(isActive) ? 1 : 0;
    const cleanDesc = description ? String(description).trim() : null;

    await query(
      `UPDATE printers
       SET name = ?, ip = ?, port = ?, type = ?, paper_width = ?, is_active = ?, description = ?
       WHERE id = ?`,
      [cleanName, cleanIp, cleanPort, cleanType, cleanWidth, cleanActive, cleanDesc, id]
    );

    // Sincronizar en cascada a production_centers y terminals enlazados
    await query(
      `UPDATE production_centers
       SET printer_name = ?, printer_ip = ?, printer_port = ?
       WHERE printer_id = ?`,
      [cleanName, cleanIp, cleanPort, id]
    );
    await query(
      `UPDATE terminals
       SET printer_name = ?, printer_ip = ?, printer_port = ?
       WHERE printer_id = ?`,
      [cleanName, cleanIp, cleanPort, id]
    );
  },

  async deletePrinter(id) {
    await query(`UPDATE production_centers SET printer_id = NULL WHERE printer_id = ?`, [id]);
    await query(`UPDATE terminals SET printer_id = NULL WHERE printer_id = ?`, [id]);
    await query(`DELETE FROM printers WHERE id = ?`, [id]);
  },

  async auditPrintersConfiguration() {
    const [orphanProducts] = await query(`
      SELECT p.id, p.name, c.name AS category_name
      FROM products p
      INNER JOIN product_categories c ON c.id = p.category_id
      LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
      WHERE p.is_active = 1
        AND p.centro_produccion_exclusivo_id IS NULL
        AND p.categoria_impresion_id IS NULL
        AND ppc.center_id IS NULL
      ORDER BY p.name ASC
    `);

    const [prodCentersAudit] = await query(`
      SELECT pc.id, pc.name, pc.printer_name, pc.printer_ip, pc.printer_port, pc.printer_id,
             (SELECT COUNT(*) FROM product_production_centers ppc WHERE ppc.center_id = pc.id) AS assigned_products
      FROM production_centers pc
      WHERE pc.is_active = 1
      ORDER BY pc.name ASC
    `);

    const [terminalsAudit] = await query(`
      SELECT t.id, t.name, t.printer_name, t.printer_ip, t.printer_port, t.printer_id, t.is_kds, oc.name AS center_name
      FROM terminals t
      INNER JOIN operation_centers oc ON oc.id = t.operation_center_id
      WHERE t.is_active = 1
      ORDER BY t.name ASC
    `);

    const [totalProductsRow] = await query(`SELECT COUNT(*) AS total FROM products WHERE is_active = 1`);
    const totalActiveProducts = Number(totalProductsRow?.[0]?.total || 0);

    const [printers] = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM production_centers pc WHERE pc.printer_id = p.id OR (pc.printer_id IS NULL AND pc.printer_ip = p.ip)) AS prod_centers_count,
        (SELECT COUNT(*) FROM terminals t WHERE t.printer_id = p.id OR (t.printer_id IS NULL AND t.printer_ip = p.ip)) AS terminals_count
      FROM printers p
      ORDER BY p.name ASC
    `);

    const [recentFails] = await query(`
      SELECT id, printer_target, printer_ip, job_type, error_message, created_at
      FROM print_jobs
      WHERE status = 'failed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return {
      totalActiveProducts,
      orphanProducts,
      productionCenters: prodCentersAudit,
      terminals: terminalsAudit,
      printers,
      recentFails,
      summary: {
        productsOk: orphanProducts.length === 0,
        prodCentersOk: prodCentersAudit.every((c) => !!c.printer_ip),
        terminalsOk: terminalsAudit.filter((t) => !t.is_kds).every((t) => !!t.printer_ip),
        printersRegistered: printers.length,
      },
    };
  },

  async getRecentPrintJobs(limit = 50) {
    const [jobs] = await query(
      `SELECT id, printer_target, printer_ip, printer_port, job_type, account_id,
              status, attempts, error_message, created_at, completed_at
       FROM print_jobs
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );
    return jobs;
  },

  // ───────── Matriz de Enrutamiento & Categorías de Impresión ─────────
  async getRoutingMatrix() {
    const [rows] = await query(
      `SELECT me.id, me.area_trabajo_id, me.categoria_impresion_id, me.centro_produccion_id,
              da.name AS area_nombre, ci.nombre AS categoria_nombre, pc.name AS centro_nombre
       FROM matriz_enrutamiento me
       INNER JOIN dining_areas da ON da.id = me.area_trabajo_id
       INNER JOIN categorias_impresion ci ON ci.id = me.categoria_impresion_id
       INNER JOIN production_centers pc ON pc.id = me.centro_produccion_id
       ORDER BY da.sort_order, da.name, ci.nombre`
    );
    return rows;
  },

  async saveRoutingRule(areaTrabajoId, categoriaImpresionId, centroProduccionId) {
    await query(
      `INSERT INTO matriz_enrutamiento (area_trabajo_id, categoria_impresion_id, centro_produccion_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE centro_produccion_id = VALUES(centro_produccion_id)`,
      [Number(areaTrabajoId), Number(categoriaImpresionId), Number(centroProduccionId)]
    );
  },

  async deleteRoutingRule(areaTrabajoId, categoriaImpresionId) {
    await query(
      `DELETE FROM matriz_enrutamiento WHERE area_trabajo_id = ? AND categoria_impresion_id = ?`,
      [Number(areaTrabajoId), Number(categoriaImpresionId)]
    );
  },

  async getPrintCategories() {
    const [rows] = await query(`SELECT id, nombre, descripcion FROM categorias_impresion ORDER BY nombre`);
    return rows;
  },

  async createPrintCategory(nombre, descripcion = null) {
    const [res] = await query(
      `INSERT INTO categorias_impresion (nombre, descripcion) VALUES (?, ?)`,
      [String(nombre).trim(), descripcion ? String(descripcion).trim() : null]
    );
    return res.insertId;
  },

  async updatePrintCategory(id, nombre, descripcion = null) {
    await query(
      `UPDATE categorias_impresion SET nombre = ?, descripcion = ? WHERE id = ?`,
      [String(nombre).trim(), descripcion ? String(descripcion).trim() : null, Number(id)]
    );
  },

  async deletePrintCategory(id) {
    await query(`DELETE FROM matriz_enrutamiento WHERE categoria_impresion_id = ?`, [Number(id)]);
    await query(`UPDATE products SET categoria_impresion_id = NULL WHERE categoria_impresion_id = ?`, [Number(id)]);
    await query(`DELETE FROM categorias_impresion WHERE id = ?`, [Number(id)]);
  },
};

module.exports = printersRepository;
