// src/modules/settings/general/general.controller.js
// Controlador HTTP para Perfil del Negocio, Branding, Logo/Fondos, Propinas y Bootstrap

const asyncHandler = require("../../../common/asyncHandler");
const generalService = require("./general.service");
const { clientIp } = require("../../../common/utils");

const generalController = {
  getBootstrap: asyncHandler(async (req, res) => {
    const ip = clientIp(req);
    const data = await generalService.getBootstrap(ip);
    res.json(data);
  }),

  getFullSettings: asyncHandler(async (req, res) => {
    const ip = clientIp(req);
    const data = await generalService.getFullSettings(ip);
    res.json(data);
  }),

  getConfigData: asyncHandler(async (_req, res) => {
    const data = await generalService.getConfigData();
    res.json(data);
  }),

  updateBranding: asyncHandler(async (req, res) => {
    const result = await generalService.updateBranding(req.body?.restaurantName);
    res.json(result);
  }),

  uploadLogo: asyncHandler(async (req, res) => {
    const result = await generalService.saveLogo(req.body?.logoData, process.cwd());
    res.json(result);
  }),

  uploadLoginBg: asyncHandler(async (req, res) => {
    const result = await generalService.saveLoginBg(req.body?.bgData, process.cwd());
    res.json(result);
  }),

  uploadReceiptLogo: asyncHandler(async (req, res) => {
    const result = await generalService.saveReceiptLogo(
      req.body?.logoData || req.body?.logo,
      process.cwd()
    );
    res.json(result);
  }),

  updateTipConfig: asyncHandler(async (req, res) => {
    const result = await generalService.updateTipConfig(req.body?.tipPercent);
    res.json(result);
  }),

  getBusinessProfile: asyncHandler(async (_req, res) => {
    const data = await generalService.getBusinessProfile();
    res.json(data);
  }),

  updateBusinessProfile: asyncHandler(async (req, res) => {
    const result = await generalService.updateBusinessProfile(req.body || {});
    res.json(result);
  }),

  getTipExcludedMethods: asyncHandler(async (_req, res) => {
    const data = await generalService.getTipExcludedMethods();
    res.json(data);
  }),

  updateTipExcludedMethods: asyncHandler(async (req, res) => {
    const result = await generalService.updateTipExcludedMethods(req.body?.excludedMethods);
    res.json(result);
  }),
};

module.exports = generalController;
