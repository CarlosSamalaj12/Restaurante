// src/modules/catalog/catalog.routes.js
// Rutas de catálogo y gestión de productos/modificadores

const express = require("express");
const catalogController = require("./catalog.controller");
const authService = require("../auth/auth.service");

const requireAuth = authService.requireAuth();
const requireAdmin = authService.requireAdmin();

// Router para /api/catalog
const catalogRouter = express.Router();
catalogRouter.use(requireAuth);
catalogRouter.get("/products", catalogController.getCatalogProducts);
catalogRouter.get("/categories", catalogController.getCatalogCategories);

// Router para /api/modifier-templates
const modifierTemplatesRouter = express.Router();
modifierTemplatesRouter.use(requireAuth);
modifierTemplatesRouter.get("/", catalogController.getModifierTemplates);

// Router para /api/settings (rutas asociadas a catálogo — requireAdmin por ruta para no bloquear settingsRouter)
const catalogSettingsRouter = express.Router();

// Categorías
catalogSettingsRouter.post("/categories", requireAdmin, catalogController.createCategory);
catalogSettingsRouter.post("/categories/reorder", requireAdmin, catalogController.reorderCategories);
catalogSettingsRouter.post("/categories/:categoryId", requireAdmin, catalogController.updateCategory);
catalogSettingsRouter.delete("/categories/:categoryId", requireAdmin, catalogController.deleteCategory);

// Productos
catalogSettingsRouter.post("/products", requireAdmin, catalogController.createProduct);
catalogSettingsRouter.post("/products-complete", requireAdmin, catalogController.createProductComplete);
catalogSettingsRouter.post("/products/:productId", requireAdmin, catalogController.updateProduct);
catalogSettingsRouter.delete("/products/:productId", requireAdmin, catalogController.deleteProduct);
catalogSettingsRouter.post("/products/:productId/production-centers", requireAdmin, catalogController.setProductProductionCenters);

// Modificadores
catalogSettingsRouter.post("/modifier-groups", requireAdmin, catalogController.createModifierGroup);
catalogSettingsRouter.post("/modifier-groups/:groupId", requireAdmin, catalogController.updateModifierGroup);
catalogSettingsRouter.delete("/modifier-groups/:groupId", requireAdmin, catalogController.deleteModifierGroup);
catalogSettingsRouter.post("/modifier-groups/:groupId/options", requireAdmin, catalogController.createModifierOption);
catalogSettingsRouter.post("/modifier-options/:optionId", requireAdmin, catalogController.updateModifierOption);
catalogSettingsRouter.delete("/modifier-options/:optionId", requireAdmin, catalogController.deleteModifierOption);

// Pasos de producto
catalogSettingsRouter.post("/product-steps", catalogController.addProductStep);
catalogSettingsRouter.delete("/product-steps/:productId/:groupId", catalogController.deleteProductStep);
catalogSettingsRouter.delete("/product-steps/:productId", catalogController.deleteAllProductSteps);

module.exports = {
  catalogRouter,
  modifierTemplatesRouter,
  catalogSettingsRouter,
};
