// src/modules/expenses/expenses.routes.js
// Definición de rutas REST para Gastos, Proveedores, Categorías y Balance

const express = require("express");
const expensesController = require("./expenses.controller");
const authService = require("../auth/auth.service");

const router = express.Router();

// Middleware ligero para resolver sesión de usuario si se envía token
router.use(async (req, res, next) => {
  const token = req.headers["x-auth-token"];
  if (token) {
    try {
      const session = await authService.getAuthSession(token);
      if (session) req.session = session;
    } catch (_) {}
  }
  next();
});

// Balance y Ganancias (P&L)
router.get("/financial-summary", expensesController.getFinancialSummary);

// Carga de Comprobantes / Vouchers
router.post("/upload-voucher", expensesController.uploadVoucher);

// Categorías
router.get("/categories", expensesController.getCategories);
router.post("/categories", expensesController.createCategory);
router.put("/categories/:id", expensesController.updateCategory);
router.delete("/categories/:id", expensesController.deleteCategory);

// Proveedores & CXP
router.get("/suppliers", expensesController.getSuppliers);
router.post("/suppliers", expensesController.createSupplier);
router.get("/suppliers/:id", expensesController.getSupplierById);
router.put("/suppliers/:id", expensesController.updateSupplier);
router.delete("/suppliers/:id", expensesController.deleteSupplier);
router.get("/suppliers/:id/statement", expensesController.getSupplierStatement);
router.post("/suppliers/:id/payments", expensesController.registerSupplierPayment);

// Gastos
router.get("/", expensesController.getExpenses);
router.post("/", expensesController.createExpense);
router.get("/:id", expensesController.getExpenseById);
router.put("/:id", expensesController.updateExpense);
router.delete("/:id", expensesController.deleteExpense);

module.exports = router;
