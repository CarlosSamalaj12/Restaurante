// src/modules/analytics/analytics.controller.js
// Controlador para el Dashboard Ejecutivo

const asyncHandler = require("../../common/asyncHandler");
const analyticsService = require("./analytics.service");

const analyticsController = {
  getDashboard: asyncHandler(async (req, res) => {
    const data = await analyticsService.getDashboardData(req.query);
    res.json(data);
  }),
};

module.exports = analyticsController;
