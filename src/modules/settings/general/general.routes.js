// src/modules/settings/general/general.routes.js
// Rutas Express para Perfil del Negocio, Branding, Logo/Fondos, Propinas y Bootstrap

const express = require("express");
const generalController = require("./general.controller");
const authService = require("../../auth/auth.service");

const requireAuth = authService.requireAuth();
const requireSuperadmin = authService.requireSuperadmin();

const generalRouter = express.Router();

// Rutas protegidas bajo /settings
generalRouter.get("/business-profile", requireAuth, generalController.getBusinessProfile);
generalRouter.put("/business-profile", requireAuth, requireSuperadmin, generalController.updateBusinessProfile);
generalRouter.post("/business-profile", requireAuth, requireSuperadmin, generalController.updateBusinessProfile);

generalRouter.post("/branding", requireAuth, requireSuperadmin, generalController.updateBranding);
generalRouter.post("/logo", requireAuth, requireSuperadmin, generalController.uploadLogo);
generalRouter.post("/login-bg", requireAuth, requireSuperadmin, generalController.uploadLoginBg);
generalRouter.post("/receipt-logo", requireAuth, requireSuperadmin, generalController.uploadReceiptLogo);
generalRouter.post("/tip-config", requireAuth, requireSuperadmin, generalController.updateTipConfig);

generalRouter.get("/tip-excluded-methods", requireAuth, generalController.getTipExcludedMethods);
generalRouter.post("/tip-excluded-methods", requireAuth, requireSuperadmin, generalController.updateTipExcludedMethods);

module.exports = {
  generalRouter,
  generalController,
};
