// src/modules/digital_menu/digital_menu.routes.js
// Enrutador orquestador modular para el Menú Digital, Auto-Comandas y Panel de Control

const express = require("express");

// Sub-enrutadores modulares por apartado funcional
const catalogRoutes = require("./routes/catalog.routes");
const sessionsRoutes = require("./routes/sessions.routes");
const ordersRoutes = require("./routes/orders.routes");
const assistanceRoutes = require("./routes/assistance.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const adminRoutes = require("./routes/admin.routes");

// ─── 1. Enrutador Público (Comensales vía QR/NFC y Kioscos) ───
// Montado en /api/public
const publicMenuRouter = express.Router();
publicMenuRouter.use(catalogRoutes);
publicMenuRouter.use(sessionsRoutes);
publicMenuRouter.use(ordersRoutes);
publicMenuRouter.use(assistanceRoutes);
publicMenuRouter.use(reviewsRoutes);

// ─── 2. Enrutador Administrativo (Configuración POS & Superadmin) ───
// Montado en /api/admin/digital-menu
const adminDigitalMenuRouter = adminRoutes;

module.exports = {
  publicMenuRouter,
  adminDigitalMenuRouter,
};
