// src/modules/payments/payments.repository.js
// Consultas SQL directas para pagos, descuentos, inventario y recibos

const { query } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const paymentsRepository = {
  /**
   * Inserta un descuento en una cuenta.
   */
  async insertDiscount({ accountId, type, value, reason = "", createdBy }, conn) {
    const q = conn ? conn.query.bind(conn) : query;
    const [result] = await q(
      `INSERT INTO account_discounts (account_id, type, value, reason, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [accountId, type, value, reason, createdBy, nowSql()]
    );
    return result.insertId;
  },

  /**
   * Busca un método de pago activo por su código normalizado.
   */
  async findActivePaymentMethod(code) {
    const [rows] = await query(
      `SELECT code, label, is_active
       FROM payment_methods
       WHERE code = ? AND is_active = 1
       LIMIT 1`,
      [code]
    );
    return rows[0] || null;
  },

  /**
   * Inserta un pago para una cuenta.
   */
  async insertPayment({ accountId, method, amount, referenceNo = "" }, conn) {
    const q = conn ? conn.query.bind(conn) : query;
    const [result] = await q(
      `INSERT INTO account_payments (account_id, method, amount, reference_no, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [accountId, method, amount, referenceNo, nowSql()]
    );
    return result.insertId;
  },

  /**
   * Obtiene el estado actual de una cuenta.
   */
  async findAccountStatus(accountId) {
    const [rows] = await query(
      `SELECT id, status, check_number FROM accounts WHERE id = ? LIMIT 1`,
      [accountId]
    );
    return rows[0] || null;
  },

  /**
   * Marca una cuenta como pagada y cerrada.
   */
  async markAccountAsPaid(accountId, closedAt = nowSql(), conn) {
    const q = conn ? conn.query.bind(conn) : query;
    await q(
      `UPDATE accounts SET status = 'paid', closed_at = ? WHERE id = ?`,
      [closedAt, accountId]
    );
  },

  /**
   * Obtiene la información de cabecera para el recibo.
   */
  async findAccountReceiptData(accountId) {
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.waiter_id, a.table_id,
              t.code AS table_code,
              u.full_name AS waiter_name
       FROM accounts a
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       WHERE a.id = ? LIMIT 1`,
      [accountId]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene los platillos activos para imprimir en el recibo.
   */
  async findAccountReceiptItems(accountId) {
    const [rows] = await query(
      `SELECT oi.qty, oi.line_total, p.name AS product_name
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id = ? AND oi.status = 'active'
       ORDER BY oi.id`,
      [accountId]
    );
    return rows;
  },

  /**
   * Obtiene los pagos registrados para el recibo.
   */
  async findAccountReceiptPayments(accountId) {
    const [rows] = await query(
      `SELECT pm.label AS method_label, p.method, p.amount
       FROM account_payments p
       LEFT JOIN payment_methods pm ON pm.code = p.method
       WHERE p.account_id = ? ORDER BY p.id`,
      [accountId]
    );
    return rows;
  },

  /**
   * Obtiene el nombre del restaurante desde app_settings.
   */
  async findRestaurantName() {
    try {
      const [rows] = await query(
        `SELECT setting_value AS name FROM app_settings WHERE setting_key = 'restaurant_name' LIMIT 1`
      );
      return rows?.[0]?.name || "RESTAURANTE";
    } catch {
      return "RESTAURANTE";
    }
  },

  /**
   * Obtiene los ítems activos de una cuenta que rastrean inventario.
   */
  async findItemsForInventoryDeduction(accountId, conn) {
    const q = conn ? conn.query.bind(conn) : query;
    const [rows] = await q(
      `SELECT oi.product_id, oi.qty, p.track_inventory
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id = ? AND oi.status = 'active'`,
      [accountId]
    );
    return rows;
  },

  /**
   * Obtiene la receta / ingredientes de un producto.
   */
  async findProductRecipe(productId, conn) {
    const q = conn ? conn.query.bind(conn) : query;
    const [rows] = await q(
      `SELECT inventory_item_id, quantity FROM product_recipes WHERE product_id = ?`,
      [productId]
    );
    return rows;
  },

  /**
   * Registra un movimiento de salida por venta.
   */
  async recordStockExit({ inventoryItemId, quantity, accountId, createdAt = nowSql() }, conn) {
    const q = conn ? conn.query.bind(conn) : query;
    await q(
      `INSERT INTO stock_movements (inventory_item_id, type, quantity, reference_type, reference_id, created_at)
       VALUES (?, 'exit', ?, 'sale', ?, ?)`,
      [inventoryItemId, quantity, accountId, createdAt]
    );
  },

  /**
   * Descuenta la cantidad del stock actual del insumo.
   */
  async decrementCurrentStock(inventoryItemId, quantity, conn) {
    const q = conn ? conn.query.bind(conn) : query;
    await q(
      `UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?`,
      [quantity, inventoryItemId]
    );
  },

  /**
   * Resuelve la terminal asociada a un usuario por centro de operación.
   */
  async findTerminalForUser(userId) {
    if (!userId) {
      const [termRows] = await query(
        `SELECT id, name, printer_name, printer_ip, printer_port
         FROM terminals
         WHERE is_active = 1
         ORDER BY id LIMIT 1`
      );
      return termRows?.[0] || null;
    }

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
};

module.exports = paymentsRepository;
