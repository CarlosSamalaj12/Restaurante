// src/modules/digital_menu/routes/catalog.routes.js
// Sub-enrutador para consulta pública de cartas, platillos e información del menú

const express = require("express");
const digitalMenuController = require("../digital_menu.controller");
const { validateTableToken } = require("../middleware/validateTableToken");

const router = express.Router();

// GET /public/menu/:slug - Obtiene el catálogo completo (categorías, platillos y promociones)
router.get("/menu/:slug", validateTableToken, digitalMenuController.getPublicMenu);

// GET /public/products/:productId - Detalle de platillo y grupo de modificadores
router.get("/products/:productId", digitalMenuController.getProductDetail);

module.exports = router;
