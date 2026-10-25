// src/modules/digital_menu/routes/admin.routes.js
// Sub-enrutador administrativo para configuración del Menú Digital, QR y Banners

const express = require("express");
const digitalMenuController = require("../digital_menu.controller");
const authService = require("../../auth/auth.service");

const router = express.Router();

// Control de Módulo Premium (Exclusivo Superadmin)
router.get("/status", authService.requireAuth(), digitalMenuController.getModuleStatus);
router.post("/toggle", authService.requireSuperadmin(), digitalMenuController.toggleModule);

// CRUD de Menús y Theming
router.get(
  "/menus",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.getAdminMenus
);
router.post(
  "/menus",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.createMenu
);
router.put(
  "/menus/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.updateMenu
);
router.delete(
  "/menus/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.deleteMenu
);

// Generador y Renovación de Códigos QR por Mesa
router.get(
  "/menus/:menuId/qr-tokens",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.getTableTokens
);
router.post(
  "/regenerate-qr",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.regenerateTableToken
);

// Gestión de Banners Promocionales
router.get(
  "/menus/:menuId/promotions",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.getPromotions
);
router.post(
  "/promotions",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.createPromotion
);
router.delete(
  "/promotions/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.deletePromotion
);

// Subida de Imágenes para Menú (Logo, Banners, Platillos)
router.post(
  "/upload-image",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.uploadImage
);

// Actualización rápida de Multimedia y Atributos de Platillo
router.put(
  "/products/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.updateProductInfo
);

// Atender llamado de mesero en mesa
router.post(
  "/table/:tableId/attend-call",
  authService.requireAuth(),
  digitalMenuController.attendWaiterCall
);

// ─── Gestión de Traducciones (ES -> EN) ───
router.get(
  "/translations",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.getTranslations
);
router.post(
  "/translations",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.saveTranslations
);
router.post(
  "/auto-translate",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.autoTranslate
);

module.exports = router;
