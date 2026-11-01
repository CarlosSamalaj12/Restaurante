// src/modules/settings/staff/staff.routes.js
// Rutas Express para Personal, Roles, Permisos y Módulos

const express = require("express");
const staffController = require("./staff.controller");
const authService = require("../../auth/auth.service");

const requireAuth = authService.requireAuth();
const requireSuperadmin = authService.requireSuperadmin();

const staffRouter = express.Router();
staffRouter.use(requireAuth);

// Módulos
staffRouter.post("/user-modules", requireSuperadmin, staffController.updateUserModules);
staffRouter.post("/device-modules", requireSuperadmin, staffController.updateDeviceModules);

// Roles y Permisos (Exclusivo Superadmin)
staffRouter.get("/roles", requireSuperadmin, staffController.getRoles);
staffRouter.post("/roles", requireSuperadmin, staffController.createRole);
staffRouter.put("/roles/:roleId", requireSuperadmin, staffController.updateRole);
staffRouter.delete("/roles/:roleId", requireSuperadmin, staffController.deleteRole);
staffRouter.post("/roles/:roleId/permissions", requireSuperadmin, staffController.setRolePermissions);
staffRouter.post("/users/:userId/roles", requireSuperadmin, staffController.setUserRoles);

// Usuarios del Sistema (Exclusivo Superadmin)
staffRouter.post("/staff-users", requireSuperadmin, staffController.createStaffUser);
staffRouter.put("/staff-users/:userId", requireSuperadmin, staffController.updateStaffUser);
staffRouter.delete("/staff-users/:userId", requireSuperadmin, staffController.deleteStaffUser);
staffRouter.post("/staff-users/:userId/center", requireSuperadmin, staffController.setStaffUserCenter);

module.exports = staffRouter;
