// src/modules/shifts/shifts.controller.js
// Controlador HTTP para el manejo de turnos, arqueo y corte de caja

const shiftsService = require("./shifts.service");
const asyncHandler = require("../../common/asyncHandler");

const shiftsController = {
  getActiveShift: asyncHandler(async (req, res) => {
    const { centerId } = req.query;
    const result = await shiftsService.getActiveShift(centerId);
    res.json(result);
  }),

  openShift: asyncHandler(async (req, res) => {
    const { cashierId, note = "", centerId, openingCash = 0 } = req.body || {};
    const result = await shiftsService.openShift({
      cashierId,
      note,
      centerId,
      openingCash,
      session: req.session,
    });
    res.status(201).json(result);
  }),

  getPreview: asyncHandler(async (req, res) => {
    const { centerId, closingCash } = req.query;
    const result = await shiftsService.getShiftPreview({
      centerId,
      closingCash,
    });
    res.json(result);
  }),

  closeShift: asyncHandler(async (req, res) => {
    const { cashierId, note = "", centerId, closingCash = null } = req.body || {};
    const result = await shiftsService.closeShift({
      cashierId,
      note,
      centerId,
      closingCash,
      session: req.session,
    });
    res.json(result);
  }),

  getClosedShifts: asyncHandler(async (req, res) => {
    const { centerId, limit = 20 } = req.query;
    const result = await shiftsService.getClosedShifts(centerId, limit);
    res.json(result);
  }),

  getShiftReport: asyncHandler(async (req, res) => {
    const result = await shiftsService.getShiftReport(req.params.shiftId);
    res.json(result);
  }),
};

module.exports = shiftsController;
