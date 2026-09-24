// src/modules/cxc/cxc.repository.js
// Consultas SQL directas para Cuentas por Cobrar (áreas, clientes, cuentas, pagos y estados de cuenta)

const { query } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const cxcRepository = {
  // ─── Áreas CXC ───
  async findAllAreas() {
    const [rows] = await query(
      `SELECT id, name, is_active, created_at FROM cxc_areas WHERE is_active = 1 ORDER BY name`
    );
    return rows;
  },

  async insertArea({ name, isActive = 1 }) {
    const [result] = await query(
      `INSERT INTO cxc_areas (name, is_active) VALUES (?, ?)`,
      [name, isActive]
    );
    return result.insertId;
  },

  async updateArea(areaId, { name, isActive }) {
    await query(
      `UPDATE cxc_areas SET name = COALESCE(?, name), is_active = COALESCE(?, is_active) WHERE id = ?`,
      [name, isActive, areaId]
    );
  },

  async softDeleteArea(areaId) {
    await query(`UPDATE cxc_areas SET is_active = 0 WHERE id = ?`, [areaId]);
  },

  // ─── Clientes CXC ───
  async findAllClients() {
    const [rows] = await query(`
      SELECT c.*, ca.name as area_name
      FROM customers c
      LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
      WHERE c.cxc_enabled = 1 AND c.is_active = 1
      ORDER BY c.full_name
    `);
    return rows;
  },

  async findClientById(clientId) {
    const [rows] = await query(
      `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, c.cxc_enabled, c.is_active, c.created_at, ca.name as area_name
       FROM customers c 
       LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id 
       WHERE c.id = ?`,
      [clientId]
    );
    return rows[0] || null;
  },

  async insertClient({ fullName, phone = null, creditLimit = 0, cxcAreaId = null, defaultDiscountPercent = 0, isActive = 1 }) {
    const [result] = await query(
      `INSERT INTO customers (full_name, phone, cxc_enabled, credit_limit, cxc_area_id, default_discount_percent, is_active) 
       VALUES (?, ?, 1, ?, ?, ?, ?)`,
      [fullName, phone, creditLimit, cxcAreaId, defaultDiscountPercent, isActive]
    );
    return result.insertId;
  },

  async updateClient(clientId, { fullName, phone, creditLimit, cxcAreaId, defaultDiscountPercent, isActive }) {
    await query(
      `UPDATE customers SET 
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        credit_limit = COALESCE(?, credit_limit),
        cxc_area_id = COALESCE(?, cxc_area_id),
        default_discount_percent = COALESCE(?, default_discount_percent),
        is_active = COALESCE(?, is_active)
      WHERE id = ? AND cxc_enabled = 1`,
      [fullName, phone, creditLimit, cxcAreaId, defaultDiscountPercent, isActive, clientId]
    );
  },

  async updateCustomerBalance(clientId, newBalance) {
    await query(`UPDATE customers SET current_balance = ? WHERE id = ?`, [newBalance, clientId]);
  },

  async decrementCustomerBalance(clientId, amount) {
    await query(`UPDATE customers SET current_balance = current_balance - ? WHERE id = ?`, [amount, clientId]);
  },

  // ─── Categorías permitidas por cliente ───
  async findClientCategories(clientId) {
    const [rows] = await query(`
      SELECT cc.id, cc.category_id, pc.name as category_name, cc.allow_discount
      FROM cxc_client_categories cc
      JOIN product_categories pc ON cc.category_id = pc.id
      WHERE cc.client_id = ?
    `, [clientId]);
    return rows;
  },

  async upsertClientCategory({ clientId, categoryId, allowDiscount = 1 }) {
    await query(
      `INSERT INTO cxc_client_categories (client_id, category_id, allow_discount) VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE allow_discount = VALUES(allow_discount)`,
      [clientId, categoryId, allowDiscount]
    );
  },

  async deleteClientCategory(clientId, categoryId) {
    await query(`DELETE FROM cxc_client_categories WHERE client_id = ? AND category_id = ?`, [clientId, categoryId]);
  },

  // ─── Categorías y Descuento CXC ───
  async findAllCategoriesWithClient(clientId = null) {
    const [rows] = await query(`SELECT id, name, discount_blocked, sort_order FROM product_categories ORDER BY sort_order`);
    if (clientId) {
      const [allowed] = await query(`SELECT category_id, allow_discount FROM cxc_client_categories WHERE client_id = ?`, [clientId]);
      const allowedMap = new Map(allowed.map((a) => [a.category_id, a.allow_discount]));
      rows.forEach((r) => {
        r.client_can_discount = allowedMap.has(r.id) ? allowedMap.get(r.id) : 0;
      });
    }
    return rows;
  },

  async checkDiscountEligibility({ clientId, productId }) {
    const [client] = await query(`SELECT default_discount_percent, cxc_enabled FROM customers WHERE id = ?`, [clientId]);
    if (!client.length || !client[0].cxc_enabled) return { allowed: false, discount: 0 };

    const [product] = await query(`SELECT category_id, allow_discount FROM products WHERE id = ?`, [productId]);
    if (!product.length || !product[0].allow_discount) {
      return { allowed: false, discount: 0, reason: "Producto no permite descuento" };
    }

    const [category] = await query(`SELECT discount_blocked FROM product_categories WHERE id = ?`, [product[0].category_id]);
    if (category.length && category[0].discount_blocked) {
      return { allowed: false, discount: 0, reason: "Categoría no permite descuento" };
    }

    const [clientCat] = await query(
      `SELECT allow_discount FROM cxc_client_categories WHERE client_id = ? AND category_id = ?`,
      [clientId, product[0].category_id]
    );
    if (clientCat.length && !clientCat[0].allow_discount) {
      return { allowed: false, discount: 0, reason: "Cliente tiene descuento bloqueado para esta categoría" };
    }

    return { allowed: true, discount: client[0].default_discount_percent || 0 };
  },

  // ─── Cuentas CXC y Pagos ───
  async insertCxcAccount({ clientId, accountId, shiftId, amount, balance, reference = "", notes = "" }) {
    const [result] = await query(
      `INSERT INTO cxc_accounts (client_id, account_id, shift_id, amount, balance, reference, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [clientId, accountId, shiftId, amount, balance, reference, notes]
    );
    return result.insertId;
  },

  async findCxcAccountById(cxcAccountId) {
    const [rows] = await query(`
      SELECT cxa.*, c.full_name as client_name, c.credit_limit, c.current_balance,
             u.full_name as waiter_name
      FROM cxc_accounts cxa
      JOIN customers c ON cxa.client_id = c.id
      LEFT JOIN accounts a ON cxa.account_id = a.id
      LEFT JOIN staff_users u ON a.waiter_id = u.id
      WHERE cxa.id = ?
    `, [cxcAccountId]);
    return rows[0] || null;
  },

  async findCxcPaymentsByAccountId(cxcAccountId) {
    const [rows] = await query(
      `SELECT * FROM cxc_payments WHERE cxc_account_id = ? ORDER BY created_at DESC`,
      [cxcAccountId]
    );
    return rows;
  },

  async findOrderItemsByAccountId(accountId) {
    const [rows] = await query(`
      SELECT oi.id, oi.product_id, p.name as product_name, oi.qty, oi.unit_price, oi.line_total, oi.notes, oi.seat_no
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.account_id = ? AND oi.status = 'active'
      ORDER BY oi.created_at
    `, [accountId]);
    return rows;
  },

  async findAccountsByClientId(clientId) {
    const [rows] = await query(`
      SELECT cxa.*, a.check_number, u.full_name as waiter_name
      FROM cxc_accounts cxa
      LEFT JOIN accounts a ON cxa.account_id = a.id
      LEFT JOIN staff_users u ON a.waiter_id = u.id
      WHERE cxa.client_id = ?
      ORDER BY cxa.created_at DESC
    `, [clientId]);
    return rows;
  },

  async findPendingAccountsByClient() {
    const [rows] = await query(`
      SELECT c.id as client_id, c.full_name, c.credit_limit, c.current_balance,
        (c.credit_limit - c.current_balance) as available_credit,
        COUNT(cxa.id) as pending_accounts,
        SUM(cxa.balance) as total_pending
      FROM customers c
      JOIN cxc_accounts cxa ON c.id = cxa.client_id AND cxa.status IN ('pending', 'partial')
      WHERE c.cxc_enabled = 1 AND c.is_active = 1
      GROUP BY c.id
      ORDER BY c.full_name
    `);
    return rows;
  },

  async findPendingAccountsForClientFIFO(clientId) {
    const [rows] = await query(
      `SELECT id, balance, amount FROM cxc_accounts WHERE client_id = ? AND status IN ('pending', 'partial') ORDER BY created_at ASC`,
      [clientId]
    );
    return rows;
  },

  async insertCxcPayment({ cxcAccountId, amount, paymentMethod, reference = "", notes = "" }) {
    await query(
      `INSERT INTO cxc_payments (cxc_account_id, amount, payment_method, reference, notes) VALUES (?, ?, ?, ?, ?)`,
      [cxcAccountId, amount, paymentMethod, reference, notes]
    );
  },

  async updateCxcAccountAfterPayment({ cxcAccountId, balance, status, paidAt = null }) {
    await query(
      `UPDATE cxc_accounts SET balance = ?, status = ?, paid_at = ? WHERE id = ?`,
      [balance, status, paidAt, cxcAccountId]
    );
  },

  // ─── Reporte y Estado de Cuenta ───
  async findClientStatementCenters(clientId) {
    try {
      const [rows] = await query(
        `SELECT DISTINCT oc.id, oc.name
         FROM cxc_accounts cxa
         INNER JOIN accounts a ON cxa.account_id = a.id
         INNER JOIN restaurant_tables t ON t.id = a.table_id
         INNER JOIN operation_centers oc ON oc.id = t.operation_center_id
         WHERE cxa.client_id = ?
         ORDER BY oc.name`,
        [clientId]
      );
      return rows;
    } catch {
      return [];
    }
  },

  async findStatementAccounts({ clientId, centerId, startDate, endDate, checkNumber }) {
    const accParams = [clientId];
    let accWhere = `cxa.client_id = ?`;
    if (centerId) { accWhere += ` AND t.operation_center_id = ?`; accParams.push(centerId); }
    if (startDate) { accWhere += ` AND cxa.created_at >= ?`; accParams.push(startDate); }
    if (endDate) { accWhere += ` AND cxa.created_at <= ?`; accParams.push(`${endDate} 23:59:59`); }
    if (checkNumber) { accWhere += ` AND a.check_number LIKE ?`; accParams.push(`%${checkNumber}%`); }

    try {
      const [rows] = await query(
        `SELECT cxa.id, cxa.amount, cxa.balance, cxa.status, cxa.created_at, cxa.reference, cxa.notes,
                a.check_number, u.full_name as waiter_name, oc.name as center_name
         FROM cxc_accounts cxa
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN staff_users u ON a.waiter_id = u.id
         LEFT JOIN restaurant_tables t ON t.id = a.table_id
         LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
         WHERE ${accWhere}
         ORDER BY cxa.created_at ASC`,
        accParams
      );
      return rows;
    } catch {
      const [rows] = await query(
        `SELECT cxa.id, cxa.amount, cxa.balance, cxa.status, cxa.created_at, cxa.reference, cxa.notes,
                a.check_number, u.full_name as waiter_name, NULL as center_name
         FROM cxc_accounts cxa
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN staff_users u ON a.waiter_id = u.id
         WHERE ${accWhere}
         ORDER BY cxa.created_at ASC`,
        accParams
      );
      return rows;
    }
  },

  async findStatementPayments({ accountIds, startDate, endDate }) {
    if (!accountIds.length) return [];
    const payParams = [...accountIds];
    let payWhere = `cp.cxc_account_id IN (${accountIds.map(() => "?").join(",")})`;
    if (startDate) { payWhere += ` AND cp.created_at >= ?`; payParams.push(startDate); }
    if (endDate) { payWhere += ` AND cp.created_at <= ?`; payParams.push(`${endDate} 23:59:59`); }

    const [rows] = await query(
      `SELECT cp.*, cxa.account_id 
       FROM cxc_payments cp 
       JOIN cxc_accounts cxa ON cp.cxc_account_id = cxa.id 
       WHERE ${payWhere} 
       ORDER BY cp.created_at ASC`,
      payParams
    );
    return rows;
  },

  async findPendingSummaryRows({ centerId, startDate, endDate }) {
    let whereCharge = `cxa.id IS NOT NULL`;
    const chargeParams = [];
    if (startDate) { whereCharge += ` AND cxa.created_at >= ?`; chargeParams.push(startDate); }
    if (endDate) { whereCharge += ` AND cxa.created_at <= ?`; chargeParams.push(`${endDate} 23:59:59`); }
    if (centerId) { whereCharge += ` AND t.operation_center_id = ?`; chargeParams.push(centerId); }

    try {
      const [rows] = await query(
        `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, ca.name as area_name,
                COUNT(DISTINCT cxa.id) as account_count,
                COALESCE(SUM(cxa.amount), 0) as total_charged,
                COALESCE(SUM(cxp.amount), 0) as total_paid
         FROM customers c
         LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
         LEFT JOIN cxc_accounts cxa ON cxa.client_id = c.id
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN restaurant_tables t ON t.id = a.table_id
         LEFT JOIN cxc_payments cxp ON cxp.cxc_account_id = cxa.id
         WHERE c.cxc_enabled = 1 AND c.is_active = 1 AND ${whereCharge}
         GROUP BY c.id
         HAVING total_charged > 0
         ORDER BY c.full_name`,
        chargeParams
      );
      return rows;
    } catch {
      const fbParams = [];
      let fbWhere = `cxa.id IS NOT NULL`;
      if (startDate) { fbWhere += ` AND cxa.created_at >= ?`; fbParams.push(startDate); }
      if (endDate) { fbWhere += ` AND cxa.created_at <= ?`; fbParams.push(`${endDate} 23:59:59`); }

      const [rows] = await query(
        `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, ca.name as area_name,
                COUNT(DISTINCT cxa.id) as account_count,
                COALESCE(SUM(cxa.amount), 0) as total_charged,
                COALESCE(SUM(cxp.amount), 0) as total_paid
         FROM customers c
         LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
         LEFT JOIN cxc_accounts cxa ON cxa.client_id = c.id
         LEFT JOIN cxc_payments cxp ON cxp.cxc_account_id = cxa.id
         WHERE c.cxc_enabled = 1 AND c.is_active = 1 AND ${fbWhere}
         GROUP BY c.id
         HAVING total_charged > 0
         ORDER BY c.full_name`,
        fbParams
      );
      return rows;
    }
  },

  async findSummaryCenters() {
    try {
      const [rows] = await query(
        `SELECT DISTINCT oc.id, oc.name
         FROM cxc_accounts cxa
         INNER JOIN accounts a ON cxa.account_id = a.id
         INNER JOIN restaurant_tables t ON t.id = a.table_id
         INNER JOIN operation_centers oc ON oc.id = t.operation_center_id
         ORDER BY oc.name`
      );
      return rows;
    } catch {
      return [];
    }
  },
};

module.exports = cxcRepository;
