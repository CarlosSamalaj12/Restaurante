// src/modules/digital_menu/routes/reviews.routes.js
// Sub-enrutador para calificaciones y opiniones de comensales

const express = require("express");
const digitalMenuController = require("../digital_menu.controller");

const router = express.Router();

// POST /public/reviews - Registra reseña de 1 a 5 estrellas para un platillo
router.post("/reviews", digitalMenuController.createReview);

module.exports = router;
