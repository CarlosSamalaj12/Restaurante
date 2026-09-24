// src/modules/auth/auth.routes.js
// Rutas de la API para autenticación

const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const asyncHandler = require("../../common/asyncHandler");

router.post("/pin-login", asyncHandler(authController.pinLogin));
router.post("/logout", asyncHandler(authController.logout));
router.post("/refresh-session", asyncHandler(authController.refreshSession));

module.exports = router;
