// src/modules/kds/kds.controller.js
// Controlador HTTP para KDS (Sistema de Pantallas de Cocina)

const kdsService = require("./kds.service");
const asyncHandler = require("../../common/asyncHandler");

const kdsController = {
  // ─── Control de Módulo Premium (Exclusivo Superadmin) ───
  getModuleStatus: asyncHandler(async (req, res) => {
    const isEnabled = await kdsService.isModuleEnabled();
    res.json({ enabled: isEnabled });
  }),

  toggleModule: asyncHandler(async (req, res) => {
    const { enabled } = req.body || {};
    const result = await kdsService.toggleModuleEnabled(Boolean(enabled), req.authUser);
    res.json(result);
  }),

  getActiveOrders: asyncHandler(async (req, res) => {
    const { centerId, productionCenterId, operationCenterId } = req.query;
    const result = await kdsService.getActiveOrders({
      productionCenterId: productionCenterId || centerId,
      operationCenterId,
    });
    res.json(result);
  }),

  getOrdersWithVoided: asyncHandler(async (req, res) => {
    const { centerId, productionCenterId, operationCenterId } = req.query;
    const result = await kdsService.getOrdersWithVoided({
      productionCenterId: productionCenterId || centerId,
      operationCenterId,
    });
    res.json(result);
  }),

  getMyStation: asyncHandler(async (req, res) => {
    const serial = req.headers["x-terminal-serial"] || null;
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
    const terminalId = req.headers["x-kds-terminal-id"] || req.query?.terminalId || null;
    const result = await kdsService.getMyStation({ serial, ip, terminalId });
    res.json(result);
  }),

  markItemDone: asyncHandler(async (req, res) => {
    const itemId = Number(req.params.itemId);
    const userId = req.user?.id || req.session?.userId || null;
    const result = await kdsService.markItemDone(itemId, userId);
    res.json(result);
  }),

  markAccountDone: asyncHandler(async (req, res) => {
    const accountId = Number(req.params.accountId);
    const userId = req.user?.id || req.session?.userId || null;
    const productionCenterId = req.query?.productionCenterId || req.body?.productionCenterId || null;
    const result = await kdsService.markAccountDone(accountId, userId, productionCenterId);
    res.json(result);
  }),

  getCompleted: asyncHandler(async (req, res) => {
    const { centerId, limit = 50 } = req.query;
    const result = await kdsService.getCompletedItems({ centerId, limit });
    res.json(result);
  }),

  getVoided: asyncHandler(async (req, res) => {
    const { centerId, limit = 20 } = req.query;
    const result = await kdsService.getVoidedItems({ centerId, limit });
    res.json(result);
  }),

  getProductionCenters: asyncHandler(async (_req, res) => {
    const result = await kdsService.getProductionCenters();
    res.json(result);
  }),

  getReport: asyncHandler(async (req, res) => {
    const { date, centerId, limit = 100 } = req.query;
    const result = await kdsService.getKdsReport({ date, centerId, limit });
    res.json(result);
  }),
};

module.exports = kdsController;
