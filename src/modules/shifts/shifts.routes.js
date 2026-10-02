// src/modules/shifts/shifts.routes.js
// Rutas HTTP para turnos y arqueos de caja

const express = require("express");
const shiftsController = require("./shifts.controller");
const authService = require("../auth/auth.service");

const shiftsRouter = express.Router();
const requireAuth = authService.requireAuth();

// Todas las rutas de turnos requieren sesión activa
shiftsRouter.use(requireAuth);

shiftsRouter.get("/active", shiftsController.getActiveShift);
shiftsRouter.post("/open", authService.requirePermission("shifts.open"), shiftsController.openShift);
shiftsRouter.get("/preview", shiftsController.getPreview);
shiftsRouter.post("/close", authService.requirePermission("shifts.close"), shiftsController.closeShift);
shiftsRouter.get("/closed", shiftsController.getClosedShifts);
shiftsRouter.post("/expenses", shiftsController.addExpense);
shiftsRouter.delete("/expenses/:expenseId", shiftsController.deleteExpense);
shiftsRouter.get("/:shiftId/report", shiftsController.getShiftReport);

module.exports = shiftsRouter;
