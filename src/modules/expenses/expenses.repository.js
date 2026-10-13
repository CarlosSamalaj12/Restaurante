// src/modules/expenses/expenses.repository.js
// Consultas SQL optimizadas para Gastos, Proveedores, Cuentas por Pagar (CXP) y Balance Financiero

const { query } = require("../../common/db");
const { money, nowSql } = require("../../common/utils");

const expensesRepository = {
  // ==========================================
  // GASTOS (EXPENSES)
  // ==========================================

  async getExpenses({
    startDate,
    endDate,
    categoryId,
    supplierId,
    paymentMethod,
    status,
    search,
    limit = 100,
    offset = 0,
  } = {}) {
    const conditions = [];
    const params = [];

    if (startDate && endDate) {
      conditions.push(`e.expense_date BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push(`e.expense_date >= ?`);
      params.push(startDate);
    } else if (endDate) {
      conditions.push(`e.expense_date <= ?`);
      params.push(endDate);
    }

    if (categoryId) {
      conditions.push(`e.category_id = ?`);
      params.push(Number(categoryId));
    }

    if (supplierId) {
      conditions.push(`e.supplier_id = ?`);
      params.push(Number(supplierId));
    }

    if (paymentMethod) {
      conditions.push(`e.payment_method = ?`);
      params.push(paymentMethod);
    }

    if (status) {
      conditions.push(`e.status = ?`);
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push(`(e.description LIKE ? OR e.document_number LIKE ? OR s.name LIKE ?)`);
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await query(
      `SELECT 
         e.id,
         DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
         e.category_id,
         c.name AS category_name,
         c.color AS category_color,
         e.supplier_id,
         s.name AS supplier_name,
         e.description,
         e.document_number,
         e.amount,
         e.payment_method,
         e.status,
         e.paid_amount,
         (e.amount - e.paid_amount) AS pending_amount,
         e.affects_shift_cash,
         e.shift_id,
         e.shift_expense_id,
         e.voucher_url,
         e.notes,
         e.created_by,
         u.full_name AS created_by_name,
         e.created_at,
         e.updated_at
       FROM expenses e
       LEFT JOIN expense_categories c ON c.id = e.category_id
       LEFT JOIN suppliers s ON s.id = e.supplier_id
       LEFT JOIN staff_users u ON u.id = e.created_by
       ${whereClause}
       ORDER BY e.expense_date DESC, e.id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return rows;
  },

  async getExpensesKpis({ startDate, endDate, categoryId, supplierId, paymentMethod, status, search } = {}) {
    const conditions = [];
    const params = [];

    if (startDate && endDate) {
      conditions.push(`e.expense_date BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }
    if (categoryId) {
      conditions.push(`e.category_id = ?`);
      params.push(Number(categoryId));
    }
    if (supplierId) {
      conditions.push(`e.supplier_id = ?`);
      params.push(Number(supplierId));
    }
    if (paymentMethod) {
      conditions.push(`e.payment_method = ?`);
      params.push(paymentMethod);
    }
    if (status) {
      conditions.push(`e.status = ?`);
      params.push(status);
    }
    if (search && search.trim()) {
      conditions.push(`(e.description LIKE ? OR e.document_number LIKE ? OR s.name LIKE ?)`);
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' THEN e.amount ELSE 0 END), 0) AS total_amount,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' THEN e.paid_amount ELSE 0 END), 0) AS paid_amount,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' AND e.payment_method = 'por_pagar' THEN (e.amount - e.paid_amount) ELSE 0 END), 0) AS pending_amount,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' AND e.payment_method = 'efectivo' THEN e.amount ELSE 0 END), 0) AS cash_amount,
         COUNT(e.id) AS total_count
       FROM expenses e
       LEFT JOIN suppliers s ON s.id = e.supplier_id
       ${whereClause}`,
      params
    );

    return {
      totalAmount: money(Number(rows[0]?.total_amount || 0)),
      paidAmount: money(Number(rows[0]?.paid_amount || 0)),
      pendingAmount: money(Number(rows[0]?.pending_amount || 0)),
      cashAmount: money(Number(rows[0]?.cash_amount || 0)),
      totalCount: Number(rows[0]?.total_count || 0),
    };
  },

  async findExpenseById(id, conn = null) {
    const [rows] = await query(
      `SELECT 
         e.id,
         DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
         e.category_id,
         c.name AS category_name,
         c.color AS category_color,
         e.supplier_id,
         s.name AS supplier_name,
         e.description,
         e.document_number,
         e.amount,
         e.payment_method,
         e.status,
         e.paid_amount,
         (e.amount - e.paid_amount) AS pending_amount,
         e.affects_shift_cash,
         e.shift_id,
         e.shift_expense_id,
         e.voucher_url,
         e.notes,
         e.created_by,
         u.full_name AS created_by_name,
         e.created_at,
         e.updated_at
       FROM expenses e
       LEFT JOIN expense_categories c ON c.id = e.category_id
       LEFT JOIN suppliers s ON s.id = e.supplier_id
       LEFT JOIN staff_users u ON u.id = e.created_by
       WHERE e.id = ?`,
      [Number(id)],
      conn
    );
    return rows[0] || null;
  },

  async insertExpense(expenseData, conn = null) {
    const {
      expenseDate,
      categoryId,
      supplierId = null,
      description,
      documentNumber = null,
      amount,
      paymentMethod = "efectivo",
      status = "paid",
      paidAmount = 0,
      affectsShiftCash = 0,
      shiftId = null,
      shiftExpenseId = null,
      voucherUrl = null,
      notes = null,
      createdBy,
    } = expenseData;

    const [result] = await query(
      `INSERT INTO expenses (
         expense_date, category_id, supplier_id, description, document_number,
         amount, payment_method, status, paid_amount, affects_shift_cash,
         shift_id, shift_expense_id, voucher_url, notes, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseDate,
        Number(categoryId),
        supplierId ? Number(supplierId) : null,
        String(description).trim(),
        documentNumber ? String(documentNumber).trim() : null,
        money(Number(amount)),
        paymentMethod,
        status,
        money(Number(paidAmount)),
        affectsShiftCash ? 1 : 0,
        shiftId ? Number(shiftId) : null,
        shiftExpenseId ? Number(shiftExpenseId) : null,
        voucherUrl || null,
        notes ? String(notes).trim() : null,
        Number(createdBy),
      ],
      conn
    );

    return result.insertId;
  },

  async updateExpense(id, expenseData, conn = null) {
    const fields = [];
    const params = [];

    if (expenseData.expenseDate !== undefined) {
      fields.push("expense_date = ?");
      params.push(expenseData.expenseDate);
    }
    if (expenseData.categoryId !== undefined) {
      fields.push("category_id = ?");
      params.push(Number(expenseData.categoryId));
    }
    if (expenseData.supplierId !== undefined) {
      fields.push("supplier_id = ?");
      params.push(expenseData.supplierId ? Number(expenseData.supplierId) : null);
    }
    if (expenseData.description !== undefined) {
      fields.push("description = ?");
      params.push(String(expenseData.description).trim());
    }
    if (expenseData.documentNumber !== undefined) {
      fields.push("document_number = ?");
      params.push(expenseData.documentNumber ? String(expenseData.documentNumber).trim() : null);
    }
    if (expenseData.amount !== undefined) {
      fields.push("amount = ?");
      params.push(money(Number(expenseData.amount)));
    }
    if (expenseData.paymentMethod !== undefined) {
      fields.push("payment_method = ?");
      params.push(expenseData.paymentMethod);
    }
    if (expenseData.status !== undefined) {
      fields.push("status = ?");
      params.push(expenseData.status);
    }
    if (expenseData.paidAmount !== undefined) {
      fields.push("paid_amount = ?");
      params.push(money(Number(expenseData.paidAmount)));
    }
    if (expenseData.affectsShiftCash !== undefined) {
      fields.push("affects_shift_cash = ?");
      params.push(expenseData.affectsShiftCash ? 1 : 0);
    }
    if (expenseData.shiftId !== undefined) {
      fields.push("shift_id = ?");
      params.push(expenseData.shiftId ? Number(expenseData.shiftId) : null);
    }
    if (expenseData.shiftExpenseId !== undefined) {
      fields.push("shift_expense_id = ?");
      params.push(expenseData.shiftExpenseId ? Number(expenseData.shiftExpenseId) : null);
    }
    if (expenseData.voucherUrl !== undefined) {
      fields.push("voucher_url = ?");
      params.push(expenseData.voucherUrl || null);
    }
    if (expenseData.notes !== undefined) {
      fields.push("notes = ?");
      params.push(expenseData.notes ? String(expenseData.notes).trim() : null);
    }

    if (fields.length === 0) return;

    params.push(Number(id));
    await query(`UPDATE expenses SET ${fields.join(", ")} WHERE id = ?`, params, conn);
  },

  async deleteExpense(id, conn = null) {
    await query(`DELETE FROM expenses WHERE id = ?`, [Number(id)], conn);
  },

  // ==========================================
  // CATEGORÍAS (CATEGORIES)
  // ==========================================

  async getCategories({ activeOnly = false } = {}) {
    const where = activeOnly ? "WHERE c.is_active = 1" : "";
    const [rows] = await query(
      `SELECT 
         c.id,
         c.name,
         c.description,
         c.color,
         c.is_active,
         c.created_at,
         COUNT(e.id) AS expenses_count,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' THEN e.amount ELSE 0 END), 0) AS total_spent
       FROM expense_categories c
       LEFT JOIN expenses e ON e.category_id = c.id
       ${where}
       GROUP BY c.id, c.name, c.description, c.color, c.is_active, c.created_at
       ORDER BY c.name ASC`
    );
    return rows;
  },

  async findCategoryById(id) {
    const [rows] = await query(`SELECT * FROM expense_categories WHERE id = ?`, [Number(id)]);
    return rows[0] || null;
  },

  async insertCategory({ name, description = null, color = "#64748b" }) {
    const [result] = await query(
      `INSERT INTO expense_categories (name, description, color, is_active)
       VALUES (?, ?, ?, 1)`,
      [String(name).trim(), description ? String(description).trim() : null, color || "#64748b"]
    );
    return result.insertId;
  },

  async updateCategory(id, { name, description, color, isActive }) {
    const fields = [];
    const params = [];

    if (name !== undefined) {
      fields.push("name = ?");
      params.push(String(name).trim());
    }
    if (description !== undefined) {
      fields.push("description = ?");
      params.push(description ? String(description).trim() : null);
    }
    if (color !== undefined) {
      fields.push("color = ?");
      params.push(color || "#64748b");
    }
    if (isActive !== undefined) {
      fields.push("is_active = ?");
      params.push(isActive ? 1 : 0);
    }

    if (!fields.length) return;
    params.push(Number(id));
    await query(`UPDATE expense_categories SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async deleteCategory(id) {
    await query(`DELETE FROM expense_categories WHERE id = ?`, [Number(id)]);
  },

  // ==========================================
  // PROVEEDORES Y CUENTAS POR PAGAR (SUPPLIERS & CXP)
  // ==========================================

  async getSuppliers({ search, onlyWithDebt = false } = {}) {
    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      conditions.push(`(s.name LIKE ? OR s.tax_id LIKE ? OR s.contact_name LIKE ? OR s.phone LIKE ?)`);
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await query(
      `SELECT 
         s.id,
         s.name,
         s.tax_id,
         s.contact_name,
         s.phone,
         s.email,
         s.address,
         s.credit_days,
         s.notes,
         s.is_active,
         s.created_at,
         s.updated_at,
         COUNT(DISTINCT e.id) AS total_bills_count,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' AND e.payment_method = 'por_pagar' THEN e.amount ELSE 0 END), 0) AS total_invoiced_credit,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' AND e.payment_method = 'por_pagar' THEN e.paid_amount ELSE 0 END), 0) AS total_paid_credit,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' AND e.payment_method = 'por_pagar' AND e.status IN ('pending', 'partial') THEN (e.amount - e.paid_amount) ELSE 0 END), 0) AS pending_balance,
         COUNT(DISTINCT CASE WHEN e.status != 'cancelled' AND e.payment_method = 'por_pagar' AND e.status IN ('pending', 'partial') THEN e.id ELSE NULL END) AS pending_bills_count
       FROM suppliers s
       LEFT JOIN expenses e ON e.supplier_id = s.id
       ${whereClause}
       GROUP BY s.id, s.name, s.tax_id, s.contact_name, s.phone, s.email, s.address, s.credit_days, s.notes, s.is_active, s.created_at, s.updated_at
       ${onlyWithDebt ? "HAVING pending_balance > 0" : ""}
       ORDER BY pending_balance DESC, s.name ASC`,
      params
    );

    return rows;
  },

  async findSupplierById(id) {
    const [rows] = await query(
      `SELECT 
         s.*,
         COALESCE(SUM(CASE WHEN e.status != 'cancelled' AND e.payment_method = 'por_pagar' AND e.status IN ('pending', 'partial') THEN (e.amount - e.paid_amount) ELSE 0 END), 0) AS pending_balance
       FROM suppliers s
       LEFT JOIN expenses e ON e.supplier_id = s.id
       WHERE s.id = ?
       GROUP BY s.id`,
      [Number(id)]
    );
    return rows[0] || null;
  },

  async insertSupplier({ name, taxId, contactName, phone, email, address, creditDays = 0, notes }) {
    const [result] = await query(
      `INSERT INTO suppliers (name, tax_id, contact_name, phone, email, address, credit_days, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        String(name).trim(),
        taxId ? String(taxId).trim() : null,
        contactName ? String(contactName).trim() : null,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
        address ? String(address).trim() : null,
        Number(creditDays || 0),
        notes ? String(notes).trim() : null,
      ]
    );
    return result.insertId;
  },

  async updateSupplier(id, data) {
    const fields = [];
    const params = [];

    if (data.name !== undefined) {
      fields.push("name = ?");
      params.push(String(data.name).trim());
    }
    if (data.taxId !== undefined) {
      fields.push("tax_id = ?");
      params.push(data.taxId ? String(data.taxId).trim() : null);
    }
    if (data.contactName !== undefined) {
      fields.push("contact_name = ?");
      params.push(data.contactName ? String(data.contactName).trim() : null);
    }
    if (data.phone !== undefined) {
      fields.push("phone = ?");
      params.push(data.phone ? String(data.phone).trim() : null);
    }
    if (data.email !== undefined) {
      fields.push("email = ?");
      params.push(data.email ? String(data.email).trim() : null);
    }
    if (data.address !== undefined) {
      fields.push("address = ?");
      params.push(data.address ? String(data.address).trim() : null);
    }
    if (data.creditDays !== undefined) {
      fields.push("credit_days = ?");
      params.push(Number(data.creditDays || 0));
    }
    if (data.notes !== undefined) {
      fields.push("notes = ?");
      params.push(data.notes ? String(data.notes).trim() : null);
    }
    if (data.isActive !== undefined) {
      fields.push("is_active = ?");
      params.push(data.isActive ? 1 : 0);
    }

    if (!fields.length) return;
    params.push(Number(id));
    await query(`UPDATE suppliers SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async deleteSupplier(id) {
    await query(`DELETE FROM suppliers WHERE id = ?`, [Number(id)]);
  },

  async getSupplierBills(supplierId) {
    const [rows] = await query(
      `SELECT 
         e.id,
         DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
         e.category_id,
         c.name AS category_name,
         e.description,
         e.document_number,
         e.amount,
         e.payment_method,
         e.status,
         e.paid_amount,
         (e.amount - e.paid_amount) AS pending_amount,
         e.voucher_url,
         e.notes,
         e.created_at
       FROM expenses e
       LEFT JOIN expense_categories c ON c.id = e.category_id
       WHERE e.supplier_id = ? AND e.status != 'cancelled'
       ORDER BY e.expense_date DESC, e.id DESC`,
      [Number(supplierId)]
    );
    return rows;
  },

  async getSupplierPayments(supplierId) {
    const [rows] = await query(
      `SELECT 
         p.id,
         p.supplier_id,
         p.expense_id,
         e.document_number AS bill_number,
         p.amount,
         p.payment_method,
         DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
         p.reference_number,
         p.voucher_url,
         p.notes,
         p.created_by,
         u.full_name AS created_by_name,
         p.created_at
       FROM supplier_payments p
       LEFT JOIN expenses e ON e.id = p.expense_id
       LEFT JOIN staff_users u ON u.id = p.created_by
       WHERE p.supplier_id = ?
       ORDER BY p.payment_date DESC, p.id DESC`,
      [Number(supplierId)]
    );
    return rows;
  },

  async insertSupplierPayment({
    supplierId,
    expenseId = null,
    amount,
    paymentMethod = "efectivo",
    paymentDate,
    referenceNumber = null,
    voucherUrl = null,
    notes = null,
    createdBy,
  }, conn = null) {
    const [result] = await query(
      `INSERT INTO supplier_payments (
         supplier_id, expense_id, amount, payment_method, payment_date,
         reference_number, voucher_url, notes, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(supplierId),
        expenseId ? Number(expenseId) : null,
        money(Number(amount)),
        paymentMethod,
        paymentDate || nowSql().split(" ")[0],
        referenceNumber ? String(referenceNumber).trim() : null,
        voucherUrl || null,
        notes ? String(notes).trim() : null,
        Number(createdBy),
      ],
      conn
    );
    return result.insertId;
  },

  // ==========================================
  // BALANCE Y GANANCIAS (PROFIT & LOSS / P&L)
  // ==========================================

  async getFinancialSummary({ startDate, endDate, centerId } = {}) {
    // 1. Ingresos por ventas desde account_payments
    const revConditions = [];
    const revParams = [];

    if (startDate && endDate) {
      revConditions.push(`p.created_at BETWEEN ? AND ?`);
      revParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else {
      revConditions.push(`DATE(p.created_at) = CURDATE()`);
    }

    if (centerId) {
      revConditions.push(`(a.operation_center_id = ? OR t.operation_center_id = ?)`);
      revParams.push(Number(centerId), Number(centerId));
    }

    const revWhere = revConditions.length ? `WHERE ${revConditions.join(" AND ")}` : "";

    const [incomeRows] = await query(
      `SELECT 
         COALESCE(SUM(p.amount), 0) AS total_revenue,
         COUNT(p.id) AS payment_transactions,
         COUNT(DISTINCT p.account_id) AS closed_accounts_count
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       ${revWhere}`,
      revParams
    );

    // 2. Ingresos desglosados por método de pago de ventas
    const [incomeByMethodRows] = await query(
      `SELECT 
         p.method,
         COALESCE(SUM(p.amount), 0) AS total
       FROM account_payments p
       INNER JOIN accounts a ON a.id = p.account_id
       LEFT JOIN restaurant_tables t ON t.id = a.table_id
       ${revWhere}
       GROUP BY p.method
       ORDER BY total DESC`,
      revParams
    );

    // 3. Gastos operativos en el mismo rango de fechas
    const expConditions = [`e.status != 'cancelled'`];
    const expParams = [];

    if (startDate && endDate) {
      expConditions.push(`e.expense_date BETWEEN ? AND ?`);
      expParams.push(startDate, endDate);
    } else {
      expConditions.push(`e.expense_date = CURDATE()`);
    }

    const expWhere = `WHERE ${expConditions.join(" AND ")}`;

    const [expenseSummaryRows] = await query(
      `SELECT 
         COALESCE(SUM(e.amount), 0) AS total_expenses,
         COALESCE(SUM(e.paid_amount), 0) AS total_paid_expenses,
         COALESCE(SUM(CASE WHEN e.payment_method = 'por_pagar' THEN (e.amount - e.paid_amount) ELSE 0 END), 0) AS total_pending_expenses,
         COUNT(e.id) AS expenses_count
       FROM expenses e
       ${expWhere}`,
      expParams
    );

    // 4. Gastos agrupados por categoría
    const [expensesByCategoryRows] = await query(
      `SELECT 
         c.id AS category_id,
         c.name AS category_name,
         c.color AS category_color,
         COALESCE(SUM(e.amount), 0) AS total_amount,
         COUNT(e.id) AS count
       FROM expenses e
       JOIN expense_categories c ON c.id = e.category_id
       ${expWhere}
       GROUP BY c.id, c.name, c.color
       ORDER BY total_amount DESC`,
      expParams
    );

    // 5. Gastos agrupados por método de pago
    const [expensesByMethodRows] = await query(
      `SELECT 
         e.payment_method,
         COALESCE(SUM(e.amount), 0) AS total_amount,
         COUNT(e.id) AS count
       FROM expenses e
       ${expWhere}
       GROUP BY e.payment_method
       ORDER BY total_amount DESC`,
      expParams
    );

    const totalRevenue = money(Number(incomeRows[0]?.total_revenue || 0));
    const totalExpenses = money(Number(expenseSummaryRows[0]?.total_expenses || 0));
    const netProfit = money(totalRevenue - totalExpenses);
    const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      revenue: {
        total: totalRevenue,
        transactionsCount: Number(incomeRows[0]?.payment_transactions || 0),
        closedAccountsCount: Number(incomeRows[0]?.closed_accounts_count || 0),
        byMethod: incomeByMethodRows.map((r) => ({
          method: r.method,
          total: money(Number(r.total || 0)),
        })),
      },
      expenses: {
        total: totalExpenses,
        totalPaid: money(Number(expenseSummaryRows[0]?.total_paid_expenses || 0)),
        totalPending: money(Number(expenseSummaryRows[0]?.total_pending_expenses || 0)),
        count: Number(expenseSummaryRows[0]?.expenses_count || 0),
        byCategory: expensesByCategoryRows.map((r) => ({
          categoryId: r.category_id,
          name: r.category_name,
          color: r.category_color,
          total: money(Number(r.total_amount || 0)),
          count: Number(r.count || 0),
          percentage: totalExpenses > 0 ? Number(((Number(r.total_amount) / totalExpenses) * 100).toFixed(1)) : 0,
        })),
        byMethod: expensesByMethodRows.map((r) => ({
          method: r.payment_method,
          total: money(Number(r.total_amount || 0)),
          count: Number(r.count || 0),
        })),
      },
      netProfit,
      profitMargin,
    };
  },
};

module.exports = expensesRepository;
