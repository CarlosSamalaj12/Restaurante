// src/modules/analytics/analytics.repository.js
// Consultas agregadas de alto rendimiento para el Dashboard Ejecutivo

const { query } = require("../../common/db");

const analyticsRepository = {
  /**
   * Obtiene las opciones disponibles para los filtros dinámicos del dashboard.
   */
  async getFilterOptions() {
    const [centers] = await query(
      `SELECT id, name FROM operation_centers WHERE is_active = 1 ORDER BY name ASC`
    );
    const [areas] = await query(
      `SELECT id, name FROM dining_areas WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
    );
    const [paymentMethods] = await query(
      `SELECT code, label FROM payment_methods WHERE is_active = 1 ORDER BY sort_order ASC, label ASC`
    );
    const [waiters] = await query(
      `SELECT id, full_name AS name FROM staff_users ORDER BY full_name ASC`
    );
    const [shifts] = await query(
      `SELECT s.id, s.opened_at, s.closed_at, s.status, u.full_name AS cashier_name, oc.name AS center_name
       FROM shifts s
       LEFT JOIN staff_users u ON u.id = s.cashier_id
       LEFT JOIN operation_centers oc ON oc.id = s.operation_center_id
       ORDER BY s.id DESC
       LIMIT 30`
    );

    return {
      centers: centers || [],
      areas: areas || [],
      paymentMethods: paymentMethods || [],
      waiters: waiters || [],
      shifts: shifts || [],
    };
  },

  /**
   * Métricas y KPIs principales agrupados según filtros.
   */
  async getExecutiveMetrics({ startDate, endDate, centerId, areaId, waiterId, method, shiftId }) {
    // 1. Base WHERE conditions para pagos y cuentas
    const paymentConditions = [];
    const paymentParams = [];

    if (startDate && endDate) {
      paymentConditions.push(`p.created_at BETWEEN ? AND ?`);
      paymentParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else {
      paymentConditions.push(`DATE(p.created_at) = CURDATE()`);
    }

    if (centerId) {
      paymentConditions.push(`(a.operation_center_id = ? OR t.operation_center_id = ?)`);
      paymentParams.push(Number(centerId), Number(centerId));
    }
    if (areaId) {
      paymentConditions.push(`t.area_id = ?`);
      paymentParams.push(Number(areaId));
    }
    if (waiterId) {
      paymentConditions.push(`a.waiter_id = ?`);
      paymentParams.push(Number(waiterId));
    }
    if (shiftId) {
      paymentConditions.push(`a.shift_id = ?`);
      paymentParams.push(Number(shiftId));
    }
    if (method) {
      paymentConditions.push(`p.method = ?`);
      paymentParams.push(String(method));
    }

    const paymentWhere = paymentConditions.length ? `WHERE ${paymentConditions.join(" AND ")}` : "";

    // KPI: Ventas totales de pagos y cantidad de transacciones
    const [kpiRows] = await query(
      `SELECT 
         COALESCE(SUM(p.amount), 0) AS total_revenue,
         COUNT(p.id) AS payment_transactions,
         COUNT(DISTINCT p.account_id) AS closed_accounts_count
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       ${paymentWhere}`,
      paymentParams
    );

    const totalRevenue = Number(kpiRows[0]?.total_revenue || 0);
    const closedAccountsCount = Number(kpiRows[0]?.closed_accounts_count || 0);
    const avgTicket = closedAccountsCount > 0 ? totalRevenue / closedAccountsCount : 0;

    // KPI: Descuentos totales aplicados
    const discountConditions = [];
    const discountParams = [];
    if (startDate && endDate) {
      discountConditions.push(`d.created_at BETWEEN ? AND ?`);
      discountParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else {
      discountConditions.push(`DATE(d.created_at) = CURDATE()`);
    }
    if (centerId) {
      discountConditions.push(`(a.operation_center_id = ? OR t.operation_center_id = ?)`);
      discountParams.push(Number(centerId), Number(centerId));
    }
    if (areaId) {
      discountConditions.push(`t.area_id = ?`);
      discountParams.push(Number(areaId));
    }
    if (waiterId) {
      discountConditions.push(`a.waiter_id = ?`);
      discountParams.push(Number(waiterId));
    }
    if (shiftId) {
      discountConditions.push(`a.shift_id = ?`);
      discountParams.push(Number(shiftId));
    }
    const discountWhere = discountConditions.length ? `WHERE ${discountConditions.join(" AND ")}` : "";

    const [discountRows] = await query(
      `SELECT COALESCE(SUM(d.value), 0) AS total_discounts
       FROM account_discounts d
       INNER JOIN accounts a ON a.id = d.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       ${discountWhere}`,
      discountParams
    );
    const totalDiscounts = Number(discountRows[0]?.total_discounts || 0);

    // KPI: Cuentas abiertas actualmente
    const [openAccountsRow] = await query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(oi.line_total), 0) AS potential_revenue
       FROM accounts a
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       LEFT JOIN order_items oi ON oi.account_id = a.id AND oi.status = 'active'
       WHERE a.status = 'open'
       ${centerId ? "AND (a.operation_center_id = ? OR t.operation_center_id = ?)" : ""}`,
      centerId ? [Number(centerId), Number(centerId)] : []
    );
    const openAccountsCount = Number(openAccountsRow[0]?.count || 0);
    const openPotentialRevenue = Number(openAccountsRow[0]?.potential_revenue || 0);

    // 2. Curva de ventas por hora (00 a 23 hrs)
    const [hourlyRows] = await query(
      `SELECT 
         HOUR(p.created_at) AS hour_num,
         COALESCE(SUM(p.amount), 0) AS total_sales,
         COUNT(p.id) AS count
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       ${paymentWhere}
       GROUP BY HOUR(p.created_at)
       ORDER BY hour_num ASC`,
      paymentParams
    );

    const hourlyMap = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { hour: `${String(h).padStart(2, "0")}:00`, total: 0, count: 0 };
    }
    for (const r of hourlyRows) {
      const h = Number(r.hour_num);
      if (hourlyMap[h]) {
        hourlyMap[h].total = Number(r.total_sales || 0);
        hourlyMap[h].count = Number(r.count || 0);
      }
    }
    const salesByHour = Object.values(hourlyMap);

    // 3. Distribución por forma de pago
    const [methodRows] = await query(
      `SELECT 
         p.method,
         COALESCE(pm.label, p.method) AS label,
         COALESCE(SUM(p.amount), 0) AS total,
         COUNT(p.id) AS count
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       LEFT JOIN payment_methods pm ON pm.code = p.method
       ${paymentWhere}
       GROUP BY p.method, pm.label
       ORDER BY total DESC`,
      paymentParams
    );

    const salesByMethod = methodRows.map((r) => ({
      method: r.method,
      label: r.label,
      total: Number(r.total || 0),
      count: Number(r.count || 0),
      percentage: totalRevenue > 0 ? Number(((Number(r.total || 0) / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    // 4. Ventas por Área del Restaurante
    const [areaRows] = await query(
      `SELECT 
         COALESCE(da.name, 'Sin Área') AS area_name,
         COALESCE(SUM(p.amount), 0) AS total,
         COUNT(DISTINCT a.id) AS tickets
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       LEFT JOIN dining_areas da ON da.id = t.area_id
       ${paymentWhere}
       GROUP BY da.id, da.name
       ORDER BY total DESC`,
      paymentParams
    );

    const salesByArea = areaRows.map((r) => ({
      name: r.area_name,
      total: Number(r.total || 0),
      tickets: Number(r.tickets || 0),
    }));

    // 5. Ventas por Centro de Consumo
    const [centerRows] = await query(
      `SELECT 
         COALESCE(oc.name, 'Principal') AS center_name,
         COALESCE(SUM(p.amount), 0) AS total,
         COUNT(DISTINCT a.id) AS tickets
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       LEFT JOIN operation_centers oc ON oc.id = COALESCE(a.operation_center_id, t.operation_center_id)
       ${paymentWhere}
       GROUP BY oc.id, oc.name
       ORDER BY total DESC`,
      paymentParams
    );

    const salesByCenter = centerRows.map((r) => ({
      name: r.center_name,
      total: Number(r.total || 0),
      tickets: Number(r.tickets || 0),
    }));

    // 6. Ranking de Rendimiento de Meseros
    const [waiterRows] = await query(
      `SELECT 
         u.id,
         u.full_name AS waiter_name,
         COALESCE(SUM(p.amount), 0) AS total_sales,
         COUNT(DISTINCT a.id) AS accounts_count
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       ${paymentWhere}
       GROUP BY u.id, u.full_name
       ORDER BY total_sales DESC
       LIMIT 10`,
      paymentParams
    );

    const waiterRanking = waiterRows.map((r) => ({
      id: r.id,
      name: r.waiter_name,
      totalSales: Number(r.total_sales || 0),
      accountsCount: Number(r.accounts_count || 0),
      averageTicket: Number(r.accounts_count || 0) > 0 ? Number(r.total_sales || 0) / Number(r.accounts_count) : 0,
    }));

    // 7. Top 10 Platillos / Productos Vendidos
    const itemConditions = [];
    const itemParams = [];
    if (startDate && endDate) {
      itemConditions.push(`oi.created_at BETWEEN ? AND ?`);
      itemParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else {
      itemConditions.push(`DATE(oi.created_at) = CURDATE()`);
    }
    itemConditions.push(`oi.status = 'active'`);

    if (centerId) {
      itemConditions.push(`(a.operation_center_id = ? OR t.operation_center_id = ?)`);
      itemParams.push(Number(centerId), Number(centerId));
    }
    if (areaId) {
      itemConditions.push(`t.area_id = ?`);
      itemParams.push(Number(areaId));
    }
    if (waiterId) {
      itemConditions.push(`a.waiter_id = ?`);
      itemParams.push(Number(waiterId));
    }

    const itemWhere = `WHERE ${itemConditions.join(" AND ")}`;

    const [productRows] = await query(
      `SELECT 
         pr.id,
         pr.name AS product_name,
         pc.name AS category_name,
         COALESCE(SUM(oi.qty), 0) AS quantity_sold,
         COALESCE(SUM(oi.line_total), 0) AS total_revenue
       FROM order_items oi
       INNER JOIN products pr ON pr.id = oi.product_id
       LEFT JOIN product_categories pc ON pc.id = pr.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       ${itemWhere}
       GROUP BY pr.id, pr.name, pc.name
       ORDER BY quantity_sold DESC
       LIMIT 10`,
      itemParams
    );

    const topProducts = productRows.map((r) => ({
      id: r.id,
      name: r.product_name,
      category: r.category_name || "General",
      quantity: Number(r.quantity_sold || 0),
      revenue: Number(r.total_revenue || 0),
    }));

    return {
      kpis: {
        totalRevenue,
        closedAccountsCount,
        avgTicket,
        totalDiscounts,
        openAccountsCount,
        openPotentialRevenue,
      },
      salesByHour,
      salesByMethod,
      salesByArea,
      salesByCenter,
      waiterRanking,
      topProducts,
    };
  },
};

module.exports = analyticsRepository;
