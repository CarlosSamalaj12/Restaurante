// src/modules/payments/payments.controller.js
// Controlador HTTP para pagos, descuentos y cierre de cuentas

const asyncHandler = require("../../common/asyncHandler");
const paymentsService = require("./payments.service");

const paymentsController = {
  /**
   * POST /api/accounts/:accountId/discounts
   */
  addDiscount: asyncHandler(async (req, res) => {
    const accountId = Number(req.params.accountId);
    const { type, value, reason = "", createdBy } = req.body || {};

    const totals = await paymentsService.addDiscount({
      accountId,
      type,
      value,
      reason,
      createdBy,
    });

    res.status(201).json(totals);
  }),

  /**
   * POST /api/accounts/:accountId/payments
   */
  addPayment: asyncHandler(async (req, res) => {
    const accountId = Number(req.params.accountId);
    const { method, amount, referenceNo = "" } = req.body || {};
    const userId = req.user?.id || req.session?.userId || null;

    const totals = await paymentsService.addPayment({
      accountId,
      method,
      amount,
      referenceNo,
      userId,
    });

    res.status(201).json(totals);
  }),

  /**
   * POST /api/accounts/:accountId/close
   */
  closeAccount: asyncHandler(async (req, res) => {
    const accountId = Number(req.params.accountId);
    const userId = req.user?.id || req.session?.userId || null;

    const result = await paymentsService.closeAccount({
      accountId,
      userId,
    });

    res.json(result);
  }),
};

module.exports = paymentsController;
