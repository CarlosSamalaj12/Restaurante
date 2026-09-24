// src/modules/shifts/shifts.service.js
// Lógica de negocio para apertura, arqueo, corte de caja y reportes de turnos

const shiftsRepository = require("./shifts.repository");
const authService = require("../auth/auth.service");
const { money, nowSql } = require("../../common/utils");
const { BadRequestError, NotFoundError, ForbiddenError } = require("../../common/errors");

const shiftsService = {
  /**
   * Obtiene el turno activo para un centro de operación.
   */
  async getActiveShift(centerId) {
    const parsedCenterId = Number(centerId);
    if (!parsedCenterId) throw new BadRequestError("centerId es requerido");

    const shift = await shiftsRepository.findActiveShift(parsedCenterId);
    return {
      active: Boolean(shift),
      shift: shift || null,
    };
  },

  /**
   * Abre un nuevo turno para el cajero en el centro indicado.
   */
  async openShift({ cashierId, note = "", centerId, openingCash = 0, session = null }) {
    if (session && !authService.hasPermission(session, "shifts.open")) {
      throw new ForbiddenError("No tienes permiso para abrir turnos");
    }

    const parsedCashierId = Number(cashierId);
    const parsedCenterId = Number(centerId);

    if (!parsedCashierId || !parsedCenterId) {
      throw new BadRequestError("cashierId y centerId son requeridos");
    }

    const openShift = await shiftsRepository.findActiveShift(parsedCenterId);
    if (openShift) {
      throw new BadRequestError("Ya existe un turno abierto en este centro");
    }

    const shiftId = await shiftsRepository.insertShift({
      cashierId: parsedCashierId,
      centerId: parsedCenterId,
      note,
      openingCash: Number(openingCash) || 0,
      openedAt: nowSql(),
    });

    return { shiftId };
  },

  /**
   * Genera el desglose completo del corte de caja y estadísticas del turno.
   */
  async getShiftSummary(shiftId, closingCash = null) {
    const parsedShiftId = Number(shiftId);
    if (!parsedShiftId) throw new BadRequestError("shiftId inválido");

    const shift = await shiftsRepository.findShiftById(parsedShiftId);
    if (!shift) return null;

    const openingCash = money(Number(shift.opening_cash || 0));
    const summary = await shiftsRepository.getShiftPaymentTotals(parsedShiftId);
    const methods = await shiftsRepository.getActivePaymentMethods();
    const paymentsDetail = await shiftsRepository.getShiftPaymentsDetail(parsedShiftId);
    const voidedItems = await shiftsRepository.getShiftVoidedItems(parsedShiftId);
    const openAccounts = await shiftsRepository.getShiftOpenAccounts(parsedShiftId);
    const paidAccounts = await shiftsRepository.getShiftPaidAccounts(parsedShiftId);

    const cashTotal = money(Number(summary.cash_total || 0));
    const expectedCash = money(openingCash + cashTotal);

    return {
      ...summary,
      openingCash,
      cashTotal,
      expectedCash,
      closingCash: closingCash !== null && closingCash !== undefined ? money(Number(closingCash)) : null,
      methods,
      paymentsDetail,
      voidedItems,
      openAccounts,
      paidAccounts,
    };
  },

  /**
   * Vista previa del arqueo del turno actual antes del cierre.
   */
  async getShiftPreview({ centerId, closingCash = null }) {
    const parsedCenterId = Number(centerId);
    if (!parsedCenterId) throw new BadRequestError("centerId es requerido");

    const openShift = await shiftsRepository.findActiveShift(parsedCenterId);
    if (!openShift) {
      throw new BadRequestError("No hay turno abierto en este centro");
    }

    const summary = await this.getShiftSummary(
      openShift.id,
      closingCash !== undefined && closingCash !== null ? Number(closingCash) : null
    );

    return {
      shiftId: openShift.id,
      openedAt: openShift.opened_at,
      summary,
    };
  },

  /**
   * Cierra el turno activo, registra arqueo de caja y retorna el balance final.
   */
  async closeShift({ cashierId, note = "", centerId, closingCash = null, session = null }) {
    if (session && !authService.hasPermission(session, "shifts.close")) {
      throw new ForbiddenError("No tienes permiso para cerrar turnos");
    }

    const parsedCenterId = Number(centerId);
    if (!parsedCenterId) throw new BadRequestError("centerId es requerido");

    const openShift = await shiftsRepository.findActiveShift(parsedCenterId);
    if (!openShift) {
      throw new BadRequestError("No hay turno abierto en este centro");
    }

    const shiftId = openShift.id;
    const closedAt = nowSql();

    await shiftsRepository.updateShiftClose({
      shiftId,
      cashierId: Number(cashierId) || openShift.cashier_id,
      closedAt,
      closingNote: note,
      closingCash,
    });

    const summary = await this.getShiftSummary(shiftId, closingCash);

    return {
      shiftId,
      openedAt: openShift.opened_at,
      closedAt,
      summary,
    };
  },

  /**
   * Lista los turnos cerrados de un centro de operación.
   */
  async getClosedShifts(centerId, limit = 20) {
    const parsedCenterId = Number(centerId);
    if (!parsedCenterId) throw new BadRequestError("centerId es requerido");

    return shiftsRepository.findClosedShifts(parsedCenterId, Number(limit) || 20);
  },

  /**
   * Obtiene el reporte histórico de un turno por su ID.
   */
  async getShiftReport(shiftId) {
    const parsedShiftId = Number(shiftId);
    if (!parsedShiftId) throw new BadRequestError("shiftId inválido");

    const shift = await shiftsRepository.findShiftById(parsedShiftId);
    if (!shift) throw new NotFoundError("Turno no encontrado");

    const summary = await this.getShiftSummary(parsedShiftId, shift.closing_cash);

    return {
      shift,
      summary,
    };
  },
};

module.exports = shiftsService;
