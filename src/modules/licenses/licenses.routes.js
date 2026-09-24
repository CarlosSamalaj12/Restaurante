// src/modules/licenses/licenses.routes.js
// Rutas de Express para el sistema de licencias

const express = require("express");
const licensesController = require("./licenses.controller");
const authService = require("../auth/auth.service");
const asyncHandler = require("../../common/asyncHandler");

const licenseRouter = express.Router();
licenseRouter.post("/enroll", licensesController.enroll);
licenseRouter.post("/heartbeat", licensesController.heartbeat);
licenseRouter.get("/status", licensesController.status);
licenseRouter.post("/admin-self-approve", asyncHandler(licensesController.adminSelfApprove));

const adminLicenseRouter = express.Router();
adminLicenseRouter.use(authService.requireAdmin());
adminLicenseRouter.get("/licenses", licensesController.listLicenses);
adminLicenseRouter.post("/licenses", licensesController.createLicense);
adminLicenseRouter.post("/licenses/:id/revoke", licensesController.revokeLicense);
adminLicenseRouter.get("/terminals", licensesController.listTerminals);
adminLicenseRouter.post("/terminals/:id/approve", licensesController.approveTerminal);
adminLicenseRouter.post("/terminals/:id/revoke", licensesController.revokeTerminal);
adminLicenseRouter.post("/terminals/:id/replace", licensesController.replaceTerminal);
adminLicenseRouter.put("/terminals/:id", asyncHandler(licensesController.updateTerminal));
adminLicenseRouter.patch("/terminals/:id", asyncHandler(licensesController.updateTerminal));
adminLicenseRouter.get("/license-audit", licensesController.getAuditLog);

module.exports = {
  licenseRouter,
  adminLicenseRouter,
};
