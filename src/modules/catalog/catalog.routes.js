// src/modules/catalog/catalog.routes.js
// Rutas de catálogo y gestión de productos/modificadores

const express = require("express");
const catalogController = require("./catalog.controller");

// Router para /api/catalog
const catalogRouter = express.Router();
catalogRouter.get("/products", catalogController.getCatalogProducts);
catalogRouter.get("/categories", catalogController.getCatalogCategories);

// Router para /api/modifier-templates
const modifierTemplatesRouter = express.Router();
modifierTemplatesRouter.get("/", catalogController.getModifierTemplates);

// Router para /api/settings (rutas asociadas a catálogo)
const catalogSettingsRouter = express.Router();

// Categorías
catalogSettingsRouter.post("/categories", catalogController.createCategory);
catalogSettingsRouter.post("/categories/reorder", catalogController.reorderCategories);
catalogSettingsRouter.post("/categories/:categoryId", catalogController.updateCategory);
catalogSettingsRouter.delete("/categories/:categoryId", catalogController.deleteCategory);

// Productos
catalogSettingsRouter.post("/products", catalogController.createProduct);
catalogSettingsRouter.post("/products-complete", catalogController.createProductComplete);
catalogSettingsRouter.post("/products/:productId", catalogController.updateProduct);
catalogSettingsRouter.delete("/products/:productId", catalogController.deleteProduct);
catalogSettingsRouter.post("/products/:productId/production-centers", catalogController.setProductProductionCenters);

// Modificadores
catalogSettingsRouter.post("/modifier-groups", catalogController.createModifierGroup);
catalogSettingsRouter.post("/modifier-groups/:groupId", catalogController.updateModifierGroup);
catalogSettingsRouter.delete("/modifier-groups/:groupId", catalogController.deleteModifierGroup);
catalogSettingsRouter.post("/modifier-groups/:groupId/options", catalogController.createModifierOption);
catalogSettingsRouter.post("/modifier-options/:optionId", catalogController.updateModifierOption);
catalogSettingsRouter.delete("/modifier-options/:optionId", catalogController.deleteModifierOption);

// Pasos de producto
catalogSettingsRouter.post("/product-steps", catalogController.addProductStep);
catalogSettingsRouter.delete("/product-steps/:productId/:groupId", catalogController.deleteProductStep);
catalogSettingsRouter.delete("/product-steps/:productId", catalogController.deleteAllProductSteps);

module.exports = {
  catalogRouter,
  modifierTemplatesRouter,
  catalogSettingsRouter,
};
