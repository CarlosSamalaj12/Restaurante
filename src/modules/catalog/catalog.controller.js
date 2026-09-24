// src/modules/catalog/catalog.controller.js
// Controlador HTTP para catálogo, productos, categorías y modificadores

const asyncHandler = require("../../common/asyncHandler");
const catalogService = require("./catalog.service");

const catalogController = {
  getModifierTemplates: asyncHandler(async (_req, res) => {
    res.json(catalogService.getModifierTemplates());
  }),

  getCatalogProducts: asyncHandler(async (req, res) => {
    const categoryId = Number(req.query.categoryId || "0");
    const centerId = Number(req.query.centerId || "0");
    const products = await catalogService.getCatalogProducts({ categoryId, centerId });
    res.json(products);
  }),

  getCatalogCategories: asyncHandler(async (req, res) => {
    const centerId = Number(req.query.centerId || "0");
    const categories = await catalogService.getCatalogCategories({ centerId });
    res.json(categories);
  }),

  // Categories
  createCategory: asyncHandler(async (req, res) => {
    const result = await catalogService.createCategory(req.body || {});
    res.status(201).json(result);
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const result = await catalogService.updateCategory(req.params.categoryId, req.body || {});
    res.json(result);
  }),

  reorderCategories: asyncHandler(async (req, res) => {
    const result = await catalogService.reorderCategories(req.body?.order);
    res.json(result);
  }),

  deleteCategory: asyncHandler(async (req, res) => {
    const result = await catalogService.deleteCategory(req.params.categoryId);
    res.json(result);
  }),

  // Products
  createProduct: asyncHandler(async (req, res) => {
    const result = await catalogService.createProduct(req.body || {});
    res.status(201).json(result);
  }),

  updateProduct: asyncHandler(async (req, res) => {
    const result = await catalogService.updateProduct(req.params.productId, req.body || {});
    res.json(result);
  }),

  createProductComplete: asyncHandler(async (req, res) => {
    const result = await catalogService.createProductComplete(req.body || {});
    res.status(201).json(result);
  }),

  deleteProduct: asyncHandler(async (req, res) => {
    const result = await catalogService.deleteProduct(req.params.productId);
    res.json(result);
  }),

  setProductProductionCenters: asyncHandler(async (req, res) => {
    const result = await catalogService.setProductProductionCenters(
      req.params.productId,
      req.body?.centerIds
    );
    res.json(result);
  }),

  // Modifiers
  createModifierGroup: asyncHandler(async (req, res) => {
    const result = await catalogService.createModifierGroup(req.body || {});
    res.status(201).json(result);
  }),

  updateModifierGroup: asyncHandler(async (req, res) => {
    const result = await catalogService.updateModifierGroup(req.params.groupId, req.body || {});
    res.json(result);
  }),

  deleteModifierGroup: asyncHandler(async (req, res) => {
    const result = await catalogService.deleteModifierGroup(req.params.groupId);
    res.json(result);
  }),

  createModifierOption: asyncHandler(async (req, res) => {
    const result = await catalogService.createModifierOption(req.params.groupId, req.body || {});
    res.status(201).json(result);
  }),

  updateModifierOption: asyncHandler(async (req, res) => {
    const result = await catalogService.updateModifierOption(req.params.optionId, req.body || {});
    res.json(result);
  }),

  deleteModifierOption: asyncHandler(async (req, res) => {
    const result = await catalogService.deleteModifierOption(req.params.optionId);
    res.json(result);
  }),

  // Steps
  addProductStep: asyncHandler(async (req, res) => {
    const result = await catalogService.addProductStep(req.body || {});
    res.status(201).json(result);
  }),

  deleteProductStep: asyncHandler(async (req, res) => {
    const result = await catalogService.deleteProductStep(req.params.productId, req.params.groupId);
    res.json(result);
  }),

  deleteAllProductSteps: asyncHandler(async (req, res) => {
    const result = await catalogService.deleteAllProductSteps(req.params.productId);
    res.json(result);
  }),
};

module.exports = catalogController;
