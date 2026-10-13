// src/modules/expenses/expenses.controller.js
// Controlador HTTP para Gastos, Proveedores, CXP y Balance Financiero

const expensesService = require("./expenses.service");
const asyncHandler = require("../../common/asyncHandler");

const expensesController = {
  // ==========================================
  // GASTOS (EXPENSES)
  // ==========================================

  getExpenses: asyncHandler(async (req, res) => {
    const filters = {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : null,
      supplierId: req.query.supplierId ? Number(req.query.supplierId) : null,
      paymentMethod: req.query.paymentMethod || null,
      status: req.query.status || null,
      search: req.query.search || null,
      limit: req.query.limit ? Number(req.query.limit) : 200,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    };
    const result = await expensesService.getExpenses(filters);
    res.json(result);
  }),

  getExpenseById: asyncHandler(async (req, res) => {
    const expense = await expensesService.getExpenseById(req.params.id);
    res.json(expense);
  }),

  createExpense: asyncHandler(async (req, res) => {
    const user = req.session ? { id: req.session.userId } : { id: req.body.createdBy || 1 };
    const created = await expensesService.createExpense(req.body || {}, user);
    res.status(201).json(created);
  }),

  updateExpense: asyncHandler(async (req, res) => {
    const user = req.session ? { id: req.session.userId } : null;
    const updated = await expensesService.updateExpense(req.params.id, req.body || {}, user);
    res.json(updated);
  }),

  deleteExpense: asyncHandler(async (req, res) => {
    const result = await expensesService.deleteExpense(req.params.id);
    res.json(result);
  }),

  uploadVoucher: asyncHandler(async (req, res) => {
    const result = await expensesService.uploadVoucher(req.body || {});
    res.json(result);
  }),

  // ==========================================
  // CATEGORÍAS (CATEGORIES)
  // ==========================================

  getCategories: asyncHandler(async (req, res) => {
    const activeOnly = req.query.activeOnly === "true";
    const categories = await expensesService.getCategories({ activeOnly });
    res.json(categories);
  }),

  createCategory: asyncHandler(async (req, res) => {
    const category = await expensesService.createCategory(req.body || {});
    res.status(201).json(category);
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const updated = await expensesService.updateCategory(req.params.id, req.body || {});
    res.json(updated);
  }),

  deleteCategory: asyncHandler(async (req, res) => {
    const result = await expensesService.deleteCategory(req.params.id);
    res.json(result);
  }),

  // ==========================================
  // PROVEEDORES & CXP (SUPPLIERS)
  // ==========================================

  getSuppliers: asyncHandler(async (req, res) => {
    const filters = {
      search: req.query.search || null,
      onlyWithDebt: req.query.onlyWithDebt === "true",
    };
    const suppliers = await expensesService.getSuppliers(filters);
    res.json(suppliers);
  }),

  getSupplierById: asyncHandler(async (req, res) => {
    const supplier = await expensesService.getSupplierById(req.params.id);
    res.json(supplier);
  }),

  createSupplier: asyncHandler(async (req, res) => {
    const supplier = await expensesService.createSupplier(req.body || {});
    res.status(201).json(supplier);
  }),

  updateSupplier: asyncHandler(async (req, res) => {
    const updated = await expensesService.updateSupplier(req.params.id, req.body || {});
    res.json(updated);
  }),

  deleteSupplier: asyncHandler(async (req, res) => {
    const result = await expensesService.deleteSupplier(req.params.id);
    res.json(result);
  }),

  getSupplierStatement: asyncHandler(async (req, res) => {
    const statement = await expensesService.getSupplierStatement(req.params.id);
    res.json(statement);
  }),

  registerSupplierPayment: asyncHandler(async (req, res) => {
    const user = req.session ? { id: req.session.userId } : { id: req.body.createdBy || 1 };
    const payment = await expensesService.registerSupplierPayment(req.params.id, req.body || {}, user);
    res.status(201).json(payment);
  }),

  // ==========================================
  // BALANCE Y GANANCIAS (PROFIT & LOSS)
  // ==========================================

  getFinancialSummary: asyncHandler(async (req, res) => {
    const filters = {
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      centerId: req.query.centerId ? Number(req.query.centerId) : null,
    };
    const summary = await expensesService.getFinancialSummary(filters);
    res.json(summary);
  }),
};

module.exports = expensesController;
