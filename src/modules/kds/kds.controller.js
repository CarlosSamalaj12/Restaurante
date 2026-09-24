// src/modules/kds/kds.controller.js
// Controlador HTTP para KDS (Sistema de Pantallas de Cocina)

const kdsService = require("./kds.service");
const asyncHandler = require("../../common/asyncHandler");

const kdsController = {
  getActiveOrders: asyncHandler(async (req, res) => {
    const { centerId } = req.query;
    const result = await kdsService.getActiveOrders(centerId);
    res.json(result);
  }),

  getOrdersWithVoided: asyncHandler(async (req, res) => {
    const { centerId } = req.query;
    const result = await kdsService.getOrdersWithVoided(centerId);
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
    const result = await kdsService.markAccountDone(accountId, userId);
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
