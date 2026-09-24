// src/modules/reports/reports.repository.js
// Repositorio de consultas SQL especializadas en reportes

const { query } = require("../../common/db");

const reportsRepository = {
  // --- 1. Voided Items Report ---
  async getVoidedItems() {
    const [rows] = await query(
      `SELECT
         oi.id,
         a.id AS account_id,
         a.check_number,
         p.name AS product_name,
         oi.qty AS void_qty,
         oi.line_total AS void_total,
         oi.void_reason,
         oi.voided_at,
         oi.void_authorized_by,
         u.full_name AS authorized_by_name
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN products p ON p.id = oi.product_id
       LEFT JOIN staff_users u ON u.id = oi.void_authorized_by
       WHERE oi.status = 'void'
       ORDER BY oi.voided_at DESC`
    );
    return rows;
  },

  async getAccountProducts(accountIds) {
    if (!accountIds || accountIds.length === 0) return [];
    const placeholders = accountIds.map(() => "?").join(",");
    const [rows] = await query(
      `SELECT
         oi.account_id,
         p.name AS product_name,
         oi.qty,
         oi.line_total,
         oi.status
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id IN (${placeholders})
       ORDER BY oi.id ASC`,
      accountIds
    );
    return rows;
  },

  // --- 2. Waiter Tips Report ---
  async getTipPercent() {
    try {
      const [profileRows] = await query(
        `SELECT tip_percent FROM business_profile ORDER BY id ASC LIMIT 1`
      );
      if (profileRows?.[0]?.tip_percent !== undefined && profileRows?.[0]?.tip_percent !== null) {
        const pct = Number(profileRows[0].tip_percent);
        if (!Number.isNaN(pct)) return Math.max(0, Math.min(100, pct));
      }
    } catch (_) {}

    const [rows] = await query(
      `SELECT setting_value
       FROM app_settings
       WHERE setting_key = 'tip_percent'
       LIMIT 1`
    );
    const pct = Number(rows?.[0]?.setting_value || 0);
    if (Number.isNaN(pct)) return 0;
    return Math.max(0, Math.min(100, pct));
  },

  async getExcludedTipPaymentMethods() {
    const [rows] = await query(
      `SELECT code FROM payment_methods WHERE applies_tip = 0`
    );
    return rows.length ? rows.map((r) => r.code) : ["cxc"];
  },

  async getPaidAccountsForTips({ startDate, endDate, waiterId, centerId }) {
    const [rows] = await query(
      `SELECT a.id, a.waiter_id, a.operation_center_id, a.check_number, a.closed_at, a.tip_percent_override,
              u.full_name AS waiter_name, oc.name AS center_name
       FROM accounts a
       JOIN staff_users u ON u.id = a.waiter_id
       JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE a.status = 'paid'
         AND a.closed_at >= ? AND a.closed_at < DATE_ADD(?, INTERVAL 1 DAY)
         AND (? IS NULL OR a.waiter_id = ?)
         AND (? IS NULL OR a.operation_center_id = ?)
       ORDER BY u.full_name, a.closed_at`,
      [startDate, endDate, waiterId || null, waiterId || null, centerId || null, centerId || null]
    );
    return rows;
  },

  async getPaymentMethodsForAccount(accountId) {
    const [rows] = await query(
      `SELECT DISTINCT method FROM account_payments WHERE account_id = ?`,
      [accountId]
    );
    return rows.map((r) => String(r.method).trim());
  },

  // --- 3. Account Trace ---
  async getAccountTrace(accountId) {
    const [rows] = await query(
      `SELECT id, event_type, payload, created_at
       FROM account_events
       WHERE account_id = ?
       ORDER BY id`,
      [accountId]
    );
    return rows;
  },

  // --- 4. Product Sales Report ---
  async getProductSales({ startDate, endDate, centerId, categoryId, productName }) {
    const conditions = ["oi.status = 'active'", "a.status = 'paid'"];
    const params = [];
    if (startDate) {
      conditions.push("a.closed_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("a.closed_at <= ?");
      params.push(endDate + " 23:59:59");
    }
    if (centerId) {
      conditions.push("a.operation_center_id = ?");
      params.push(Number(centerId));
    }
    if (categoryId) {
      conditions.push("p.category_id = ?");
      params.push(Number(categoryId));
    }
    if (productName && productName.trim()) {
      conditions.push("p.name LIKE ?");
      params.push(`%${productName.trim()}%`);
    }

    const where = conditions.join(" AND ");

    const [rows] = await query(
      `SELECT pc.id AS category_id, pc.name AS category_name,
              p.id AS product_id, p.name AS product_name,
              SUM(oi.qty) AS total_qty,
              SUM(oi.line_total) AS total_sales,
              COUNT(DISTINCT a.id) AS account_count
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       WHERE ${where}
       GROUP BY pc.id, p.id
       ORDER BY pc.name, total_sales DESC`,
      params
    );

    const [totals] = await query(
      `SELECT COUNT(DISTINCT a.id) AS total_accounts,
              SUM(oi.qty) AS grand_qty,
              SUM(oi.line_total) AS grand_total
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       WHERE ${where}`,
      params
    );

    const [categories] = await query(
      `SELECT id, name FROM product_categories WHERE is_active = 1 ORDER BY sort_order, name`
    );

    return {
      rows,
      totals: totals[0] || { total_accounts: 0, grand_qty: 0, grand_total: 0 },
      categories,
    };
  },

  // --- 5. Sales By Payment Method ---
  async getSalesByPaymentMethod({ startDate, endDate, centerId, method }) {
    const whereClauses = ["a.status = 'paid'"];
    const params = [];

    if (startDate) {
      whereClauses.push("a.closed_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push("a.closed_at <= ?");
      params.push(endDate + " 23:59:59");
    }
    if (centerId) {
      whereClauses.push("a.operation_center_id = ?");
      params.push(Number(centerId));
    }

    const where = whereClauses.join(" AND ");

    const [methodSummary] = await query(
      `SELECT
         ap.method,
         COUNT(*) AS transaction_count,
         SUM(ap.amount) AS total_amount
       FROM account_payments ap
       INNER JOIN accounts a ON ap.account_id = a.id
       WHERE ${where}
       GROUP BY ap.method
       ORDER BY total_amount DESC`,
      params
    );

    const [grandTotal] = await query(
      `SELECT COALESCE(SUM(ap.amount), 0) AS grand_total
       FROM account_payments ap
       INNER JOIN accounts a ON ap.account_id = a.id
       WHERE ${where}`,
      params
    );

    let detailWhere = where;
    const detailParams = [...params];
    if (method && method.trim()) {
      detailWhere += ` AND ap.method = ?`;
      detailParams.push(method.trim());
    }

    const [paymentDetails] = await query(
      `SELECT
         ap.method,
         ap.amount,
         ap.reference_no,
         ap.created_at,
         a.check_number,
         a.id AS account_id,
         a.closed_at,
         oc.name AS center_name,
         (SELECT SUM(oi.line_total) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS account_total
       FROM account_payments ap
       INNER JOIN accounts a ON ap.account_id = a.id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${detailWhere}
       ORDER BY ap.created_at DESC
       LIMIT 500`,
      detailParams
    );

    const detailByMethod = {};
    for (const p of paymentDetails) {
      if (!detailByMethod[p.method]) detailByMethod[p.method] = [];
      detailByMethod[p.method].push(p);
    }

    return {
      methods: methodSummary || [],
      grand_total: grandTotal?.[0]?.grand_total || 0,
      payment_details: paymentDetails || [],
      detail_by_method: detailByMethod,
    };
  },

  // --- 6. Sales By Center ---
  async getSalesByCenter({ startDate, endDate, centerId, productName, productIds }) {
    const conditions = ["oi.status = 'active'", "a.status = 'paid'"];
    const params = [];

    if (startDate) {
      conditions.push("a.closed_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("a.closed_at <= ?");
      params.push(endDate + " 23:59:59");
    }
    if (centerId) {
      conditions.push("a.operation_center_id = ?");
      params.push(Number(centerId));
    }
    if (productName && productName.trim()) {
      conditions.push("p.name LIKE ?");
      params.push(`%${productName.trim()}%`);
    }
    if (productIds && productIds.trim()) {
      const ids = productIds.split(",").map((id) => Number(id.trim())).filter((id) => id > 0);
      if (ids.length > 0) {
        conditions.push(`p.id IN (${ids.map(() => "?").join(",")})`);
        params.push(...ids);
      }
    }

    const where = conditions.join(" AND ");

    const [centerTotals] = await query(
      `SELECT
         oc.id AS center_id,
         oc.name AS center_name,
         COUNT(DISTINCT a.id) AS account_count,
         COALESCE(SUM(oi.qty), 0) AS total_qty,
         COALESCE(SUM(oi.line_total), 0) AS total_sales
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}
       GROUP BY oc.id
       ORDER BY total_sales DESC`,
      params
    );

    const [detailRows] = await query(
      `SELECT
         oc.id AS center_id,
         oc.name AS center_name,
         pc.id AS category_id,
         pc.name AS category_name,
         p.id AS product_id,
         p.name AS product_name,
         a.check_number,
         a.id AS account_id,
         a.closed_at,
         a.merged_into_account_id,
         u.full_name AS waiter_name,
         oi.qty,
         oi.line_total
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       LEFT JOIN staff_users u ON u.id = a.waiter_id
       WHERE ${where}
       ORDER BY oc.name, pc.name, p.name, a.closed_at DESC
       LIMIT 2000`,
      params
    );

    const [groupedRows] = await query(
      `SELECT
         oc.id AS center_id,
         oc.name AS center_name,
         pc.id AS category_id,
         pc.name AS category_name,
         p.id AS product_id,
         p.name AS product_name,
         SUM(oi.qty) AS total_qty,
         SUM(oi.line_total) AS total_sales,
         COUNT(DISTINCT a.id) AS account_count
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}
       GROUP BY oc.id, pc.id, p.id
       ORDER BY oc.name, pc.name, total_sales DESC`,
      params
    );

    const mergedConds = [];
    const mergedParams = [];
    if (startDate) {
      mergedConds.push("a.closed_at >= ?");
      mergedParams.push(startDate);
    }
    if (endDate) {
      mergedConds.push("a.closed_at <= ?");
      mergedParams.push(endDate + " 23:59:59");
    }
    if (centerId) {
      mergedConds.push("a.operation_center_id = ?");
      mergedParams.push(Number(centerId));
    }
    mergedConds.push("a.status = 'void'", "a.merged_into_account_id IS NOT NULL");
    const mergedWhere = mergedConds.join(" AND ");

    const [mergedAccounts] = await query(
      `SELECT
         a.id AS account_id,
         a.check_number,
         a.closed_at,
         a.merged_into_account_id,
         oc.name AS center_name,
         oc.id AS center_id,
         u.full_name AS waiter_name
       FROM accounts a
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       LEFT JOIN staff_users u ON u.id = a.waiter_id
       WHERE ${mergedWhere}
       ORDER BY a.closed_at DESC
       LIMIT 500`,
      mergedParams
    );

    const productMap = {};
    groupedRows.forEach((r) => {
      if (!productMap[r.product_id]) {
        productMap[r.product_id] = {
          product_id: r.product_id,
          product_name: r.product_name,
          category_name: r.category_name,
          centers: [],
          total_qty: 0,
          total_sales: 0,
        };
      }
      productMap[r.product_id].centers.push({
        center_id: r.center_id,
        center_name: r.center_name,
        qty: Number(r.total_qty),
        sales: Number(r.total_sales),
        account_count: Number(r.account_count),
      });
      productMap[r.product_id].total_qty += Number(r.total_qty);
      productMap[r.product_id].total_sales += Number(r.total_sales);
    });

    const products = Object.values(productMap);
    const sharedProducts = products.filter((p) => p.centers.length > 1);
    const exclusiveProducts = products.filter((p) => p.centers.length === 1);

    const [grandTotal] = await query(
      `SELECT COALESCE(SUM(oi.line_total), 0) AS grand_total,
              COALESCE(SUM(oi.qty), 0) AS grand_qty
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       WHERE ${where}`,
      params
    );

    return {
      center_totals: centerTotals || [],
      products,
      shared_products: sharedProducts,
      exclusive_products: exclusiveProducts,
      detail_rows: detailRows || [],
      merged_accounts: mergedAccounts || [],
      grand_total: grandTotal?.[0]?.grand_total || 0,
      grand_qty: grandTotal?.[0]?.grand_qty || 0,
    };
  },

  // --- 7. Sales By User ---
  async getSalesByUser({ startDate, endDate, centerId, productIds, productName, categoryId, userIds }) {
    const conditions = ["oi.status = 'active'", "a.status = 'paid'", "u.id IS NOT NULL"];
    const params = [];

    if (startDate) {
      conditions.push("a.closed_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("a.closed_at <= ?");
      params.push(endDate + " 23:59:59");
    }
    if (centerId) {
      conditions.push("a.operation_center_id = ?");
      params.push(Number(centerId));
    }
    if (categoryId) {
      conditions.push("p.category_id = ?");
      params.push(Number(categoryId));
    }
    if (productIds && productIds.trim()) {
      const ids = productIds.split(",").map((id) => Number(id.trim())).filter((id) => id > 0);
      if (ids.length > 0) {
        conditions.push(`p.id IN (${ids.map(() => "?").join(",")})`);
        params.push(...ids);
      }
    }
    if (productName && productName.trim()) {
      conditions.push("p.name LIKE ?");
      params.push(`%${productName.trim()}%`);
    }
    if (userIds && userIds.trim()) {
      const ids = userIds.split(",").map((id) => Number(id.trim())).filter((id) => id > 0);
      if (ids.length > 0) {
        conditions.push(`a.waiter_id IN (${ids.map(() => "?").join(",")})`);
        params.push(...ids);
      }
    }

    const where = conditions.join(" AND ");

    const [detailRows] = await query(
      `SELECT
         u.id AS user_id,
         u.full_name AS user_name,
         u.role AS user_role,
         oc.id AS center_id,
         oc.name AS center_name,
         pc.id AS category_id,
         pc.name AS category_name,
         p.id AS product_id,
         p.name AS product_name,
         a.check_number,
         a.id AS account_id,
         a.closed_at,
         a.merged_into_account_id,
         oi.qty,
         oi.line_total
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}
       ORDER BY u.full_name, pc.name, p.name, a.closed_at DESC
       LIMIT 3000`,
      params
    );

    const mergedConds2 = [];
    const mergedParams2 = [];
    if (startDate) {
      mergedConds2.push("a.closed_at >= ?");
      mergedParams2.push(startDate);
    }
    if (endDate) {
      mergedConds2.push("a.closed_at <= ?");
      mergedParams2.push(endDate + " 23:59:59");
    }
    if (centerId) {
      mergedConds2.push("a.operation_center_id = ?");
      mergedParams2.push(Number(centerId));
    }
    if (userIds && userIds.trim()) {
      const ids = userIds.split(",").map((id) => Number(id.trim())).filter((id) => id > 0);
      if (ids.length > 0) {
        mergedConds2.push(`a.waiter_id IN (${ids.map(() => "?").join(",")})`);
        mergedParams2.push(...ids);
      }
    }
    mergedConds2.push("a.status = 'void'", "a.merged_into_account_id IS NOT NULL");
    const mergedWhere = mergedConds2.join(" AND ");

    const [mergedAccounts] = await query(
      `SELECT
         a.id AS account_id,
         a.check_number,
         a.closed_at,
         a.merged_into_account_id,
         u.id AS user_id,
         u.full_name AS user_name,
         u.role AS user_role,
         oc.id AS center_id,
         oc.name AS center_name
       FROM accounts a
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${mergedWhere}
       ORDER BY a.closed_at DESC
       LIMIT 500`,
      mergedParams2
    );

    const userMap = {};
    detailRows.forEach((r) => {
      if (!userMap[r.user_id]) {
        userMap[r.user_id] = {
          user_id: r.user_id,
          user_name: r.user_name,
          user_role: r.user_role,
          center_name: r.center_name,
          total_qty: 0,
          total_sales: 0,
          product_count: 0,
          products: {},
        };
      }
      if (!userMap[r.user_id].products[r.product_id]) {
        userMap[r.user_id].products[r.product_id] = {
          product_id: r.product_id,
          product_name: r.product_name,
          category_name: r.category_name,
          qty: 0,
          sales: 0,
        };
        userMap[r.user_id].product_count++;
      }
      userMap[r.user_id].products[r.product_id].qty += Number(r.qty);
      userMap[r.user_id].products[r.product_id].sales += Number(r.line_total);
      userMap[r.user_id].total_qty += Number(r.qty);
      userMap[r.user_id].total_sales += Number(r.line_total);
    });

    const users = Object.values(userMap)
      .map((u) => ({
        ...u,
        products: Object.values(u.products),
      }))
      .sort((a, b) => b.total_sales - a.total_sales);

    const productMap = {};
    detailRows.forEach((r) => {
      if (!productMap[r.product_id]) {
        productMap[r.product_id] = {
          product_id: r.product_id,
          product_name: r.product_name,
          category_name: r.category_name,
          center_name: r.center_name,
          total_qty: 0,
          total_sales: 0,
          sellers: [],
        };
      }
      if (!productMap[r.product_id].sellers.find((s) => s.user_id === r.user_id)) {
        productMap[r.product_id].sellers.push({
          user_id: r.user_id,
          user_name: r.user_name,
          qty: 0,
          sales: 0,
        });
      }
      const seller = productMap[r.product_id].sellers.find((s) => s.user_id === r.user_id);
      seller.qty += Number(r.qty);
      seller.sales += Number(r.line_total);
      productMap[r.product_id].total_qty += Number(r.qty);
      productMap[r.product_id].total_sales += Number(r.line_total);
    });

    const productComparison = Object.values(productMap).sort((a, b) => b.total_sales - a.total_sales);

    const [grandTotal] = await query(
      `SELECT COALESCE(SUM(oi.line_total), 0) AS grand_total,
              COALESCE(SUM(oi.qty), 0) AS grand_qty
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       INNER JOIN products p ON p.id = oi.product_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}`,
      params
    );

    return {
      users,
      product_comparison: productComparison,
      detail_rows: detailRows || [],
      merged_accounts: mergedAccounts || [],
      grand_total: grandTotal?.[0]?.grand_total || 0,
      grand_qty: grandTotal?.[0]?.grand_qty || 0,
    };
  },
};

module.exports = reportsRepository;
