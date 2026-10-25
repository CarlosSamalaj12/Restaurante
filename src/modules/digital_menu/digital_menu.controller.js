// src/modules/digital_menu/digital_menu.controller.js
// Controlador HTTP para canal público de comensales y administración POS de Menús Digitales

const digitalMenuService = require("./digital_menu.service");
const asyncHandler = require("../../common/asyncHandler");

const digitalMenuController = {
  // ─── Control de Módulo Premium ───
  getModuleStatus: asyncHandler(async (req, res) => {
    const isEnabled = await digitalMenuService.isModuleEnabled();
    res.json({ enabled: isEnabled });
  }),

  toggleModule: asyncHandler(async (req, res) => {
    const { enabled } = req.body || {};
    const result = await digitalMenuService.toggleModuleEnabled(Boolean(enabled), req.authUser);
    res.json(result);
  }),

  // ─── Endpoints Públicos de Comensal ───
  getPublicMenu: asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const data = await digitalMenuService.getPublicMenu(slug, req.tableContext);
    res.json(data);
  }),

  getProductDetail: asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const data = await digitalMenuService.getProductDetail(productId);
    res.json(data);
  }),

  bindDeviceSession: asyncHandler(async (req, res) => {
    const { deviceFingerprint, guestAlias, joinAccountId, menuId } = req.body || {};
    const tableId = req.tableContext ? req.tableContext.tableId : req.body.tableId;
    const result = await digitalMenuService.bindDeviceSession({
      tableId,
      deviceFingerprint,
      guestAlias,
      joinAccountId,
      menuId,
    });
    res.status(201).json(result);
  }),

  checkSessionStatus: asyncHandler(async (req, res) => {
    const { sessionToken } = req.params;
    const result = await digitalMenuService.checkSessionStatus(sessionToken);
    res.json(result);
  }),

  sendGuestOrder: asyncHandler(async (req, res) => {
    const { sessionToken, items, isKiosk, kioskDetails, paymentMethod } = req.body || {};
    const result = await digitalMenuService.sendGuestOrder({
      sessionToken,
      tableContext: req.tableContext,
      items,
      isKiosk,
      kioskDetails,
      paymentMethod,
    });
    res.status(201).json(result);
  }),

  callWaiter: asyncHandler(async (req, res) => {
    const { sessionToken, reason } = req.body || {};
    const result = await digitalMenuService.callWaiter(sessionToken, reason);
    res.json(result);
  }),

  requestBill: asyncHandler(async (req, res) => {
    const { sessionToken, paymentMethod } = req.body || {};
    const result = await digitalMenuService.requestBill(sessionToken, paymentMethod);
    res.json(result);
  }),

  createReview: asyncHandler(async (req, res) => {
    const { productId, sessionToken, rating, comment, dinerName } = req.body || {};
    const result = await digitalMenuService.createReview({
      productId,
      sessionToken,
      rating,
      comment,
      dinerName,
    });
    res.status(201).json(result);
  }),

  // ─── Endpoints Administrativos (POS Settings) ───
  getAdminMenus: asyncHandler(async (req, res) => {
    const menus = await digitalMenuService.getAdminMenus();
    res.json(menus);
  }),

  createMenu: asyncHandler(async (req, res) => {
    const result = await digitalMenuService.createMenu(req.body || {});
    res.status(201).json(result);
  }),

  updateMenu: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await digitalMenuService.updateMenu(id, req.body || {});
    res.json(result);
  }),

  deleteMenu: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await digitalMenuService.deleteMenu(id);
    res.json(result);
  }),

  getTableTokens: asyncHandler(async (req, res) => {
    const { menuId } = req.params;
    const tokens = await digitalMenuService.getTableTokens(menuId);
    res.json(tokens);
  }),

  regenerateTableToken: asyncHandler(async (req, res) => {
    const { tableId, menuId } = req.body || {};
    const result = await digitalMenuService.regenerateTableToken(tableId, menuId);
    res.json(result);
  }),

  getPromotions: asyncHandler(async (req, res) => {
    const { menuId } = req.params;
    const result = await digitalMenuService.getPromotions(menuId);
    res.json(result);
  }),

  createPromotion: asyncHandler(async (req, res) => {
    const result = await digitalMenuService.createPromotion(req.body || {});
    res.status(201).json(result);
  }),

  deletePromotion: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await digitalMenuService.deletePromotion(id);
    res.json(result);
  }),

  attendWaiterCall: asyncHandler(async (req, res) => {
    const { tableId } = req.params;
    const result = await digitalMenuService.attendWaiterCall(tableId);
    res.json(result);
  }),

  uploadImage: asyncHandler(async (req, res) => {
    const { imageData, type } = req.body || {};
    const result = await digitalMenuService.uploadImage(imageData, type, process.cwd());
    res.json(result);
  }),

  updateProductInfo: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await digitalMenuService.updateProductDigitalInfo(id, req.body || {});
    res.json(result);
  }),

  // ─── Gestión de Traducciones ───
  getTranslations: asyncHandler(async (req, res) => {
    const { menuId } = req.query;
    const data = await digitalMenuService.getTranslations(menuId ? Number(menuId) : null);
    res.json(data);
  }),

  saveTranslations: asyncHandler(async (req, res) => {
    const result = await digitalMenuService.saveTranslations(req.body);
    res.json(result);
  }),

  autoTranslate: asyncHandler(async (req, res) => {
    const result = await digitalMenuService.autoTranslate(req.body);
    res.json(result);
  }),
};

module.exports = digitalMenuController;
