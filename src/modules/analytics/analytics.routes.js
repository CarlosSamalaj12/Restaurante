// src/modules/analytics/analytics.routes.js
// Rutas de analítica y métricas para directores y gerentes

const express = require("express");
const router = express.Router();
const analyticsController = require("./analytics.controller");
const authService = require("../auth/auth.service");

// Dashboard Ejecutivo: protegido por autenticación y permiso dashboard.executive (o roles admin/manager)
router.get(
  "/dashboard",
  authService.requireAuth(),
  (req, res, next) => {
    const session = req.session;
    const role = String(session?.role || "").toLowerCase();
    if (role === "admin" || role === "manager" || authService.hasPermission(session, "dashboard.executive")) {
      return next();
    }
    return res.status(403).json({
      ok: false,
      code: "FORBIDDEN",
      message: "No tienes permiso para acceder al Dashboard Ejecutivo (requiere 'dashboard.executive')",
    });
  },
  analyticsController.getDashboard
);

module.exports = router;
