// src/modules/settings/printers/printers.controller.js
// Controlador HTTP para Impresoras, Centros de Producción, Diagnósticos, Matriz de Ruteo y Categorías

const asyncHandler = require("../../../common/asyncHandler");
const printersService = require("./printers.service");

const printersController = {
  getProductionCenters: asyncHandler(async (_req, res) => {
    const result = await printersService.getProductionCenters();
    res.json(result);
  }),

  createProductionCenter: asyncHandler(async (req, res) => {
    const result = await printersService.createProductionCenter(req.body || {});
    res.status(201).json(result);
  }),

  updateProductionCenter: asyncHandler(async (req, res) => {
    const result = await printersService.updateProductionCenter(
      req.params.centerId,
      req.body || {}
    );
    res.json(result);
  }),

  deleteProductionCenter: asyncHandler(async (req, res) => {
    const result = await printersService.deleteProductionCenter(req.params.centerId);
    res.json(result);
  }),

  testPrinter: asyncHandler(async (req, res) => {
    const result = await printersService.testPrinter(req.body || {});
    res.json(result);
  }),

  getPrintersStatus: asyncHandler(async (_req, res) => {
    res.json(printersService.getPrintersStatus());
  }),

  getPrinterRoutingMode: asyncHandler(async (_req, res) => {
    const result = await printersService.getPrinterRoutingMode();
    res.json(result);
  }),

  setPrinterRoutingMode: asyncHandler(async (req, res) => {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_) {}
    }
    const mode = body?.mode || req.query?.mode;
    const result = await printersService.setPrinterRoutingMode(mode);
    res.json(result);
  }),

  getRecentPrintJobs: asyncHandler(async (req, res) => {
    const result = await printersService.getRecentPrintJobs(req.query?.limit);
    res.json(result);
  }),

  getPrinters: asyncHandler(async (_req, res) => {
    const result = await printersService.getPrinters();
    res.json(result);
  }),

  createPrinter: asyncHandler(async (req, res) => {
    const result = await printersService.createPrinter(req.body || {});
    res.status(201).json(result);
  }),

  updatePrinter: asyncHandler(async (req, res) => {
    const result = await printersService.updatePrinter(
      req.params.printerId,
      req.body || {}
    );
    res.json(result);
  }),

  deletePrinter: asyncHandler(async (req, res) => {
    const result = await printersService.deletePrinter(req.params.printerId);
    res.json(result);
  }),

  testPrinterDirect: asyncHandler(async (req, res) => {
    const result = await printersService.testPrinterDirect(req.params.printerId);
    res.json(result);
  }),

  auditPrinters: asyncHandler(async (_req, res) => {
    const result = await printersService.auditPrinters();
    res.json(result);
  }),

  getRoutingMatrix: asyncHandler(async (_req, res) => {
    const matrix = await printersService.getRoutingMatrix();
    res.json({ matrix });
  }),

  saveRoutingRule: asyncHandler(async (req, res) => {
    const result = await printersService.saveRoutingRule(req.body || {});
    res.json(result);
  }),

  deleteRoutingRule: asyncHandler(async (req, res) => {
    const { areaTrabajoId, categoriaImpresionId } = req.body || req.query || {};
    const result = await printersService.deleteRoutingRule(
      areaTrabajoId,
      categoriaImpresionId
    );
    res.json(result);
  }),

  getPrintCategories: asyncHandler(async (_req, res) => {
    const categories = await printersService.getPrintCategories();
    res.json({ categories });
  }),

  createPrintCategory: asyncHandler(async (req, res) => {
    const result = await printersService.createPrintCategory(req.body || {});
    res.status(201).json(result);
  }),

  updatePrintCategory: asyncHandler(async (req, res) => {
    const result = await printersService.updatePrintCategory(
      req.params.id,
      req.body || {}
    );
    res.json(result);
  }),

  deletePrintCategory: asyncHandler(async (req, res) => {
    const result = await printersService.deletePrintCategory(req.params.id);
    res.json(result);
  }),
};

module.exports = printersController;
