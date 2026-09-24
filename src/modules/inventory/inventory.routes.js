// src/modules/inventory/inventory.routes.js
// Rutas HTTP para insumos, movimientos y recetas de cocina

const express = require("express");
const inventoryController = require("./inventory.controller");

const inventoryRouter = express.Router();

inventoryRouter.get("/items", inventoryController.getAllItems);
inventoryRouter.post("/items", inventoryController.createItem);
inventoryRouter.put("/items/:id", inventoryController.updateItem);
inventoryRouter.delete("/items/:id", inventoryController.deleteItem);
inventoryRouter.get("/items/:id/movements", inventoryController.getMovements);
inventoryRouter.post("/movements", inventoryController.recordMovement);
inventoryRouter.get("/products/:productId/recipe", inventoryController.getProductRecipe);
inventoryRouter.post("/products/:productId/recipe", inventoryController.saveProductRecipe);

module.exports = inventoryRouter;
