// src/modules/settings/settings.controller.js
// Controlador HTTP para configuración global, perfiles, centros, roles y terminales

const asyncHandler = require("../../common/asyncHandler");
const settingsService = require("./settings.service");
const { clientIp } = require("../../common/utils");

const settingsController = {
  getBootstrap: asyncHandler(async (req, res) => {
    const ip = clientIp(req);
    const data = await settingsService.getBootstrap(ip);
    res.json(data);
  }),

  getFullSettings: asyncHandler(async (req, res) => {
    const ip = clientIp(req);
    const data = await settingsService.getFullSettings(ip);
    res.json(data);
  }),

  getConfigData: asyncHandler(async (_req, res) => {
    const data = await settingsService.getConfigData();
    res.json(data);
  }),

  updateBranding: asyncHandler(async (req, res) => {
    const result = await settingsService.updateBranding(req.body?.restaurantName);
    res.json(result);
  }),

  uploadLogo: asyncHandler(async (req, res) => {
    const result = await settingsService.saveLogo(req.body?.logoData, process.cwd());
    res.json(result);
  }),

  uploadLoginBg: asyncHandler(async (req, res) => {
    const result = await settingsService.saveLoginBg(req.body?.bgData, process.cwd());
    res.json(result);
  }),

  updateTipConfig: asyncHandler(async (req, res) => {
    const result = await settingsService.updateTipConfig(req.body?.tipPercent);
    res.json(result);
  }),

  getBusinessProfile: asyncHandler(async (_req, res) => {
    const data = await settingsService.getBusinessProfile();
    res.json(data);
  }),

  updateBusinessProfile: asyncHandler(async (req, res) => {
    const result = await settingsService.updateBusinessProfile(req.body || {});
    res.json(result);
  }),

  getTipExcludedMethods: asyncHandler(async (_req, res) => {
    const data = await settingsService.getTipExcludedMethods();
    res.json(data);
  }),

  updateTipExcludedMethods: asyncHandler(async (req, res) => {
    const result = await settingsService.updateTipExcludedMethods(req.body?.excludedMethods);
    res.json(result);
  }),

  updateUserModules: asyncHandler(async (req, res) => {
    const result = await settingsService.updateUserModules(req.body?.userId, req.body?.moduleCodes);
    res.json(result);
  }),

  updateDeviceModules: asyncHandler(async (req, res) => {
    const ip = String(req.body?.ipAddress || clientIp(req) || "").trim();
    const result = await settingsService.updateDeviceModules(ip, req.body?.moduleCodes);
    res.json(result);
  }),

  getRoles: asyncHandler(async (_req, res) => {
    const data = await settingsService.getRoles();
    res.json(data);
  }),

  createRole: asyncHandler(async (req, res) => {
    const result = await settingsService.createRole(req.body || {});
    res.status(201).json(result);
  }),

  updateRole: asyncHandler(async (req, res) => {
    const result = await settingsService.updateRole(req.params.roleId, req.body || {});
    res.json(result);
  }),

  deleteRole: asyncHandler(async (req, res) => {
    const result = await settingsService.deleteRole(req.params.roleId);
    res.json(result);
  }),

  setRolePermissions: asyncHandler(async (req, res) => {
    const result = await settingsService.setRolePermissions(req.params.roleId, req.body?.permissionIds);
    res.json(result);
  }),

  setUserRoles: asyncHandler(async (req, res) => {
    const result = await settingsService.setUserRoles(req.params.userId, req.body?.roleIds);
    res.json(result);
  }),

  refreshSession: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.auth?.userId || req.body?.userId;
    let permissions = [];
    if (userId) {
      try {
        permissions = await settingsService.getUserPermissions(userId);
      } catch (_) {}
    }
    res.json({ ok: true, permissions });
  }),

  createOperationCenter: asyncHandler(async (req, res) => {
    const result = await settingsService.createOperationCenter(req.body || {});
    res.status(201).json(result);
  }),

  updateOperationCenter: asyncHandler(async (req, res) => {
    const result = await settingsService.updateOperationCenter(req.params.centerId, req.body || {});
    res.json(result);
  }),

  deleteOperationCenter: asyncHandler(async (req, res) => {
    const result = await settingsService.deleteOperationCenter(req.params.centerId);
    res.json(result);
  }),

  setOperationCenterProducts: asyncHandler(async (req, res) => {
    const result = await settingsService.setOperationCenterProducts(
      req.params.centerId,
      req.body?.productId,
      req.body?.isEnabled
    );
    res.json(result);
  }),

  setTerminalBinding: asyncHandler(async (req, res) => {
    const ip = String(req.body?.ipAddress || clientIp(req) || "").replace("::ffff:", "").trim();
    const result = await settingsService.setTerminalBinding(ip, req.body?.centerId, req.body?.label);
    res.status(201).json(result);
  }),

  getPaymentMethods: asyncHandler(async (_req, res) => {
    const list = await settingsService.getPaymentMethods();
    res.json({ paymentMethods: list });
  }),

  savePaymentMethod: asyncHandler(async (req, res) => {
    const result = await settingsService.savePaymentMethod(req.body || {});
    res.status(200).json(result);
  }),

  deletePaymentMethod: asyncHandler(async (req, res) => {
    const result = await settingsService.deletePaymentMethod(req.params.code);
    res.json(result);
  }),

  createDiscountPreset: asyncHandler(async (req, res) => {
    const result = await settingsService.createDiscountPreset(req.body || {});
    res.status(201).json(result);
  }),

  updateDiscountPreset: asyncHandler(async (req, res) => {
    const result = await settingsService.updateDiscountPreset(req.params.presetId, req.body || {});
    res.json(result);
  }),

  getProductionCenters: asyncHandler(async (_req, res) => {
    const result = await settingsService.getProductionCenters();
    res.json(result);
  }),

  createProductionCenter: asyncHandler(async (req, res) => {
    const result = await settingsService.createProductionCenter(req.body || {});
    res.status(201).json(result);
  }),

  updateProductionCenter: asyncHandler(async (req, res) => {
    const result = await settingsService.updateProductionCenter(req.params.centerId, req.body || {});
    res.json(result);
  }),

  deleteProductionCenter: asyncHandler(async (req, res) => {
    const result = await settingsService.deleteProductionCenter(req.params.centerId);
    res.json(result);
  }),

  testPrinter: asyncHandler(async (req, res) => {
    const result = await settingsService.testPrinter(req.body || {});
    res.json(result);
  }),

  getPrintersStatus: asyncHandler(async (_req, res) => {
    res.json(settingsService.getPrintersStatus());
  }),

  getRecentPrintJobs: asyncHandler(async (req, res) => {
    const result = await settingsService.getRecentPrintJobs(req.query?.limit);
    res.json(result);
  }),

  createStaffUser: asyncHandler(async (req, res) => {
    const result = await settingsService.createStaffUser(req.body || {});
    res.status(201).json(result);
  }),

  updateStaffUser: asyncHandler(async (req, res) => {
    const result = await settingsService.updateStaffUser(req.params.userId, req.body || {});
    res.json(result);
  }),

  deleteStaffUser: asyncHandler(async (req, res) => {
    const result = await settingsService.deleteStaffUser(req.params.userId);
    res.json(result);
  }),

  setStaffUserCenter: asyncHandler(async (req, res) => {
    const result = await settingsService.setStaffUserCenter(req.params.userId, req.body?.operationCenterId);
    res.json(result);
  }),

  createTerminal: asyncHandler(async (req, res) => {
    const result = await settingsService.createTerminal(req.body || {});
    res.status(201).json(result);
  }),

  updateTerminal: asyncHandler(async (req, res) => {
    const result = await settingsService.updateTerminal(req.params.terminalId, req.body || {});
    res.json(result);
  }),

  deleteTerminal: asyncHandler(async (req, res) => {
    const result = await settingsService.deleteTerminal(req.params.terminalId);
    res.json(result);
  }),

  // ───────── Matriz de Enrutamiento & Categorías de Impresión ─────────
  getRoutingMatrix: asyncHandler(async (_req, res) => {
    const matrix = await settingsService.getRoutingMatrix();
    res.json({ matrix });
  }),

  saveRoutingRule: asyncHandler(async (req, res) => {
    const result = await settingsService.saveRoutingRule(req.body || {});
    res.json(result);
  }),

  deleteRoutingRule: asyncHandler(async (req, res) => {
    const { areaTrabajoId, categoriaImpresionId } = req.body || req.query || {};
    const result = await settingsService.deleteRoutingRule(areaTrabajoId, categoriaImpresionId);
    res.json(result);
  }),

  getPrintCategories: asyncHandler(async (_req, res) => {
    const categories = await settingsService.getPrintCategories();
    res.json({ categories });
  }),

  createPrintCategory: asyncHandler(async (req, res) => {
    const result = await settingsService.createPrintCategory(req.body || {});
    res.status(201).json(result);
  }),

  updatePrintCategory: asyncHandler(async (req, res) => {
    const result = await settingsService.updatePrintCategory(req.params.id, req.body || {});
    res.json(result);
  }),

  deletePrintCategory: asyncHandler(async (req, res) => {
    const result = await settingsService.deletePrintCategory(req.params.id);
    res.json(result);
  }),
};

module.exports = settingsController;
