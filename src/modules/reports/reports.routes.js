// src/modules/reports/reports.routes.js
// Rutas HTTP para reportes del sistema

const express = require("express");
const router = express.Router();
const reportsController = require("./reports.controller");

router.get("/voided-items", reportsController.getVoidedItems);
router.get("/waiter-tips", reportsController.getWaiterTips);
router.get("/account-trace/:accountId", reportsController.getAccountTrace);
router.get("/product-sales", reportsController.getProductSales);
router.get("/sales-by-payment-method", reportsController.getSalesByPaymentMethod);
router.get("/sales-by-center", reportsController.getSalesByCenter);
router.get("/sales-by-user", reportsController.getSalesByUser);

module.exports = router;
