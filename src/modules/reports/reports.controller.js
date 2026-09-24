// src/modules/reports/reports.controller.js
// Controlador HTTP para endpoints de reportes

const asyncHandler = require("../../common/asyncHandler");
const reportsService = require("./reports.service");

const reportsController = {
  getVoidedItems: asyncHandler(async (_req, res) => {
    const data = await reportsService.getVoidedItemsReport();
    res.json(data);
  }),

  getWaiterTips: asyncHandler(async (req, res) => {
    const { startDate, endDate, waiterId, centerId } = req.query;
    const data = await reportsService.getWaiterTipsReport({
      startDate,
      endDate,
      waiterId: waiterId ? Number(waiterId) : null,
      centerId: centerId ? Number(centerId) : null,
    });
    res.json(data);
  }),

  getAccountTrace: asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const data = await reportsService.getAccountTraceReport(accountId);
    res.json(data);
  }),

  getProductSales: asyncHandler(async (req, res) => {
    const { startDate, endDate, centerId, categoryId, productName } = req.query;
    const data = await reportsService.getProductSalesReport({
      startDate,
      endDate,
      centerId,
      categoryId,
      productName,
    });
    res.json(data);
  }),

  getSalesByPaymentMethod: asyncHandler(async (req, res) => {
    const { startDate, endDate, centerId, method } = req.query;
    const data = await reportsService.getSalesByPaymentMethodReport({
      startDate,
      endDate,
      centerId,
      method,
    });
    res.json(data);
  }),

  getSalesByCenter: asyncHandler(async (req, res) => {
    const { startDate, endDate, centerId, productName, productIds } = req.query;
    const data = await reportsService.getSalesByCenterReport({
      startDate,
      endDate,
      centerId,
      productName,
      productIds,
    });
    res.json(data);
  }),

  getSalesByUser: asyncHandler(async (req, res) => {
    const { startDate, endDate, centerId, productIds, productName, categoryId, userIds } = req.query;
    const data = await reportsService.getSalesByUserReport({
      startDate,
      endDate,
      centerId,
      productIds,
      productName,
      categoryId,
      userIds,
    });
    res.json(data);
  }),
};

module.exports = reportsController;
