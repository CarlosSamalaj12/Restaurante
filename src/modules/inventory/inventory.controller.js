// src/modules/inventory/inventory.controller.js
// Controlador HTTP para inventario, movimientos y recetas

const inventoryService = require("./inventory.service");
const asyncHandler = require("../../common/asyncHandler");

const inventoryController = {
  getAllItems: asyncHandler(async (_req, res) => {
    const items = await inventoryService.getAllItems();
    res.json(items);
  }),

  createItem: asyncHandler(async (req, res) => {
    const result = await inventoryService.createItem(req.body || {});
    res.status(201).json(result);
  }),

  updateItem: asyncHandler(async (req, res) => {
    const result = await inventoryService.updateItem(req.params.id, req.body || {});
    res.json(result);
  }),

  deleteItem: asyncHandler(async (req, res) => {
    const result = await inventoryService.deleteItem(req.params.id);
    res.json(result);
  }),

  getMovements: asyncHandler(async (req, res) => {
    const movements = await inventoryService.getMovements(req.params.id);
    res.json(movements);
  }),

  recordMovement: asyncHandler(async (req, res) => {
    const result = await inventoryService.recordMovement(req.body || {});
    res.status(201).json(result);
  }),

  getProductRecipe: asyncHandler(async (req, res) => {
    const recipe = await inventoryService.getProductRecipe(req.params.productId);
    res.json(recipe);
  }),

  saveProductRecipe: asyncHandler(async (req, res) => {
    const { ingredients } = req.body || {};
    const result = await inventoryService.saveProductRecipe(req.params.productId, ingredients);
    res.json(result);
  }),
};

module.exports = inventoryController;
