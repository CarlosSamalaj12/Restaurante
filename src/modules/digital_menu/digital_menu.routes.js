// src/modules/digital_menu/digital_menu.routes.js
// Rutas HTTP para el canal público de comensales y el panel administrativo del POS

const express = require("express");
const digitalMenuController = require("./digital_menu.controller");
const { validateTableToken } = require("./middleware/validateTableToken");
const authService = require("../auth/auth.service");

// ─── 1. Enrutador Público (Comensales vía QR/NFC y Kioscos) ───
const publicMenuRouter = express.Router();

// Consulta de catálogo y platillos
publicMenuRouter.get("/menu/:slug", validateTableToken, digitalMenuController.getPublicMenu);
publicMenuRouter.get("/products/:productId", digitalMenuController.getProductDetail);

// Vinculación de dispositivo y verificación de sesión en mesa
publicMenuRouter.post("/session/bind", validateTableToken, digitalMenuController.bindDeviceSession);
publicMenuRouter.get("/session/:sessionToken/status", digitalMenuController.checkSessionStatus);

// Creación de Auto-Comanda (Mesa QR o Kiosco)
publicMenuRouter.post("/orders/send", validateTableToken, digitalMenuController.sendGuestOrder);

// Asistencia y cuenta en mesa
publicMenuRouter.post("/table/call-waiter", validateTableToken, digitalMenuController.callWaiter);
publicMenuRouter.post("/table/request-bill", validateTableToken, digitalMenuController.requestBill);

// Calificaciones y Reseñas
publicMenuRouter.post("/reviews", digitalMenuController.createReview);

// ─── 2. Enrutador Administrativo (Configuración POS & Superadmin) ───
const adminDigitalMenuRouter = express.Router();

// Control de Módulo Premium (Exclusivo Superadmin)
adminDigitalMenuRouter.get("/status", authService.requireAuth(), digitalMenuController.getModuleStatus);
adminDigitalMenuRouter.post("/toggle", authService.requireSuperadmin(), digitalMenuController.toggleModule);

// CRUD de Menús y Theming (Superadmin, Admin y Encargados)
adminDigitalMenuRouter.get(
  "/menus",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.getAdminMenus
);
adminDigitalMenuRouter.post(
  "/menus",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.createMenu
);
adminDigitalMenuRouter.put(
  "/menus/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.updateMenu
);
adminDigitalMenuRouter.delete(
  "/menus/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.deleteMenu
);

// Generador y Renovación de Códigos QR por Mesa
adminDigitalMenuRouter.get(
  "/menus/:menuId/qr-tokens",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.getTableTokens
);
adminDigitalMenuRouter.post(
  "/regenerate-qr",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.regenerateTableToken
);

// Gestión de Banners Promocionales
adminDigitalMenuRouter.get(
  "/menus/:menuId/promotions",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.getPromotions
);
adminDigitalMenuRouter.post(
  "/promotions",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.createPromotion
);
adminDigitalMenuRouter.delete(
  "/promotions/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.deletePromotion
);

// Subida de Imágenes para Menú (Logo, Banners, Platillos)
adminDigitalMenuRouter.post(
  "/upload-image",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.uploadImage
);

// Actualización rápida de Multimedia y Atributos de Platillo
adminDigitalMenuRouter.put(
  "/products/:id",
  authService.requirePermissionOrSupervisor("digital_menu.manage"),
  digitalMenuController.updateProductInfo
);

// Atender llamado de mesero en mesa
adminDigitalMenuRouter.post(
  "/table/:tableId/attend-call",
  authService.requireAuth(),
  digitalMenuController.attendWaiterCall
);

module.exports = {
  publicMenuRouter,
  adminDigitalMenuRouter,
};
