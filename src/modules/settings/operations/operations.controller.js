// src/modules/settings/operations/operations.controller.js
// Controlador HTTP para Centros de Operación, Terminales, Formas de Pago, Descuentos y Notas de Cocina

const asyncHandler = require("../../../common/asyncHandler");
const operationsService = require("./operations.service");
const { clientIp } = require("../../../common/utils");

const operationsController = {
  createOperationCenter: asyncHandler(async (req, res) => {
    const result = await operationsService.createOperationCenter(req.body || {});
    res.status(201).json(result);
  }),

  updateOperationCenter: asyncHandler(async (req, res) => {
    const result = await operationsService.updateOperationCenter(
      req.params.centerId,
      req.body || {}
    );
    res.json(result);
  }),

  getOperationCenterUsage: asyncHandler(async (req, res) => {
    const result = await operationsService.getOperationCenterUsage(req.params.centerId);
    res.json(result);
  }),

  deleteOperationCenter: asyncHandler(async (req, res) => {
    const result = await operationsService.deleteOperationCenter(req.params.centerId);
    res.json(result);
  }),

  setOperationCenterProducts: asyncHandler(async (req, res) => {
    const result = await operationsService.setOperationCenterProducts(
      req.params.centerId,
      req.body?.productId,
      req.body?.isEnabled
    );
    res.json(result);
  }),

  setTerminalBinding: asyncHandler(async (req, res) => {
    const ip = String(req.body?.ipAddress || clientIp(req) || "").replace("::ffff:", "").trim();
    const result = await operationsService.setTerminalBinding(
      ip,
      req.body?.centerId,
      req.body?.label
    );
    res.status(201).json(result);
  }),

  getPaymentMethods: asyncHandler(async (_req, res) => {
    const list = await operationsService.getPaymentMethods();
    res.json({ paymentMethods: list, methods: list });
  }),

  savePaymentMethod: asyncHandler(async (req, res) => {
    const result = await operationsService.savePaymentMethod(req.body || {});
    res.status(200).json(result);
  }),

  deletePaymentMethod: asyncHandler(async (req, res) => {
    const result = await operationsService.deletePaymentMethod(req.params.code);
    res.json(result);
  }),

  createDiscountPreset: asyncHandler(async (req, res) => {
    const result = await operationsService.createDiscountPreset(req.body || {});
    res.status(201).json(result);
  }),

  updateDiscountPreset: asyncHandler(async (req, res) => {
    const result = await operationsService.updateDiscountPreset(
      req.params.presetId,
      req.body || {}
    );
    res.json(result);
  }),

  createTerminal: asyncHandler(async (req, res) => {
    const result = await operationsService.createTerminal(req.body || {});
    res.status(201).json(result);
  }),

  updateTerminal: asyncHandler(async (req, res) => {
    const result = await operationsService.updateTerminal(
      req.params.terminalId,
      req.body || {}
    );
    res.json(result);
  }),

  deleteTerminal: asyncHandler(async (req, res) => {
    const result = await operationsService.deleteTerminal(req.params.terminalId);
    res.json(result);
  }),

  getKitchenNotes: asyncHandler(async (req, res) => {
    const activeOnly = req.query?.activeOnly === "true" || req.query?.activeOnly === "1";
    const notes = await operationsService.getKitchenNotes({ activeOnly });
    res.json({ notes });
  }),

  createKitchenNote: asyncHandler(async (req, res) => {
    const result = await operationsService.createKitchenNote(req.body || {});
    res.status(201).json(result);
  }),

  updateKitchenNote: asyncHandler(async (req, res) => {
    const result = await operationsService.updateKitchenNote(req.params.id, req.body || {});
    res.json(result);
  }),

  deleteKitchenNote: asyncHandler(async (req, res) => {
    const result = await operationsService.deleteKitchenNote(req.params.id);
    res.json(result);
  }),
};

module.exports = operationsController;
