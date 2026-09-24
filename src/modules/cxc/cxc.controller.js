// src/modules/cxc/cxc.controller.js
// Controlador HTTP para Cuentas por Cobrar (CXC)

const cxcService = require("./cxc.service");
const asyncHandler = require("../../common/asyncHandler");

const cxcController = {
  // Áreas
  getAreas: asyncHandler(async (_req, res) => {
    const areas = await cxcService.getAreas();
    res.json(areas);
  }),

  createArea: asyncHandler(async (req, res) => {
    const result = await cxcService.createArea(req.body || {});
    res.json(result);
  }),

  updateArea: asyncHandler(async (req, res) => {
    const result = await cxcService.updateArea(req.params.areaId, req.body || {});
    res.json(result);
  }),

  deleteArea: asyncHandler(async (req, res) => {
    const result = await cxcService.deleteArea(req.params.areaId);
    res.json(result);
  }),

  // Clientes
  getClients: asyncHandler(async (_req, res) => {
    const clients = await cxcService.getClients();
    res.json(clients);
  }),

  createClient: asyncHandler(async (req, res) => {
    const result = await cxcService.createClient(req.body || {});
    res.json(result);
  }),

  updateClient: asyncHandler(async (req, res) => {
    const result = await cxcService.updateClient(req.params.clientId, req.body || {});
    res.json(result);
  }),

  getClientCategories: asyncHandler(async (req, res) => {
    const categories = await cxcService.getClientCategories(req.params.clientId);
    res.json(categories);
  }),

  addClientCategory: asyncHandler(async (req, res) => {
    const result = await cxcService.addClientCategory(req.params.clientId, req.body || {});
    res.json(result);
  }),

  deleteClientCategory: asyncHandler(async (req, res) => {
    const result = await cxcService.deleteClientCategory(req.params.clientId, req.params.categoryId);
    res.json(result);
  }),

  getCategories: asyncHandler(async (req, res) => {
    const categories = await cxcService.getCategories(req.query.client_id);
    res.json(categories);
  }),

  // Cuentas y Pagos
  createAccount: asyncHandler(async (req, res) => {
    const result = await cxcService.createAccount(req.body || {});
    res.json(result);
  }),

  addAccountPayment: asyncHandler(async (req, res) => {
    const result = await cxcService.addAccountPayment(req.params.cxcAccountId, req.body || {});
    res.json(result);
  }),

  getAccountById: asyncHandler(async (req, res) => {
    const account = await cxcService.getAccountById(req.params.cxcAccountId);
    res.json(account);
  }),

  getClientAccounts: asyncHandler(async (req, res) => {
    const accounts = await cxcService.getClientAccounts(req.params.clientId);
    res.json(accounts);
  }),

  getPending: asyncHandler(async (_req, res) => {
    const pending = await cxcService.getPendingAccounts();
    res.json(pending);
  }),

  checkDiscount: asyncHandler(async (req, res) => {
    const result = await cxcService.checkDiscount(req.query.client_id, req.query.product_id);
    res.json(result);
  }),

  payGlobal: asyncHandler(async (req, res) => {
    const result = await cxcService.payGlobal(req.params.clientId, req.body || {});
    res.json(result);
  }),

  // Reportes y Estados de Cuenta
  getStatement: asyncHandler(async (req, res) => {
    const statement = await cxcService.getStatement(req.params.clientId, req.query);
    res.json(statement);
  }),

  getPendingSummary: asyncHandler(async (req, res) => {
    const summary = await cxcService.getPendingSummary(req.query);
    res.json(summary);
  }),

  exportStatement: asyncHandler(async (req, res) => {
    const user = req.user?.full_name || req.session?.userName || "Usuario";
    await cxcService.exportStatementToExcel(req.params.clientId, req.query, user, res);
  }),

  exportPendingSummary: asyncHandler(async (req, res) => {
    const user = req.user?.full_name || req.session?.userName || "Usuario";
    await cxcService.exportPendingSummaryToExcel(req.query, user, res);
  }),
};

module.exports = cxcController;
