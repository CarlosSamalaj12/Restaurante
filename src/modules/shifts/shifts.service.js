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

    // Vincular cuentas abiertas del centro que no tenían turno asignado
    await shiftsRepository.attachOrphanAccountsToShift(shiftId, parsedCenterId, nowSql());

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
    const expenses = await shiftsRepository.getShiftExpenses(parsedShiftId);
    const itemsSold = await shiftsRepository.getShiftItemsSold(parsedShiftId);

    const expensesTotal = money(expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0));
    const cashTotal = money(Number(summary.cash_total || 0));
    const expectedCash = money(openingCash + cashTotal - expensesTotal);

    const totalChecks = Number(summary.total_checks || 0);
    const grandTotal = money(Number(summary.grand_total || 0));
    const averageTicket = totalChecks > 0 ? money(grandTotal / totalChecks) : 0;

    return {
      ...summary,
      shiftId: parsedShiftId,
      cashierId: shift.cashier_id,
      cashierName: shift.cashier_name,
      openingCash,
      cashTotal,
      expensesTotal,
      expenses,
      itemsSold,
      averageTicket,
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

    // Vincular cuentas huérfanas cobradas o abiertas durante este turno antes de calcular el corte
    await shiftsRepository.attachOrphanAccountsToShift(openShift.id, parsedCenterId, openShift.opened_at);

    const summary = await this.getShiftSummary(
      openShift.id,
      closingCash !== undefined && closingCash !== null ? Number(closingCash) : null
    );

    return {
      shiftId: openShift.id,
      openedAt: openShift.opened_at,
      cashierId: openShift.cashier_id,
      openingCash: Number(openShift.opening_cash || 0),
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

    // Vincular cuentas antes de cerrar definitivamente
    await shiftsRepository.attachOrphanAccountsToShift(openShift.id, parsedCenterId, openShift.opened_at);

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
  /**
   * Registra un retiro de efectivo o gasto operativo de caja chica en el turno activo.
   */
  async addShiftExpense({ centerId, shiftId = null, amount, reason, authPin = null, session = null }) {
    const parsedAmount = Number(amount || 0);
    if (!parsedAmount || parsedAmount <= 0) {
      throw new BadRequestError("El monto del retiro debe ser mayor a 0");
    }

    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      throw new BadRequestError("El motivo del retiro o gasto es requerido");
    }

    let activeShift = null;
    if (shiftId) {
      activeShift = await shiftsRepository.findShiftById(Number(shiftId));
      if (!activeShift || activeShift.status !== "open") {
        throw new BadRequestError("El turno no existe o ya está cerrado");
      }
    } else if (centerId) {
      activeShift = await shiftsRepository.findActiveShift(Number(centerId));
      if (!activeShift) {
        throw new BadRequestError("No hay turno abierto en este centro");
      }
    } else {
      throw new BadRequestError("centerId o shiftId es requerido");
    }

    let authorizedById = null;
    if (authPin) {
      const ordersRepository = require("../orders/orders.repository");
      const authResult = await ordersRepository.findManagerOrAdminByPin(authPin);
      if (!authResult || !authResult.ok) {
        throw new ForbiddenError(authResult?.message || "PIN inválido o sin permisos para autorizar retiros");
      }
      authorizedById = authResult.user.id;
    } else if (session) {
      const role = String(session.role || "").toLowerCase();
      if (role === "admin" || role === "manager" || authService.hasPermission(session, "shifts.expenses")) {
        authorizedById = session.userId || session.id;
      } else {
        throw new ForbiddenError("Se requiere PIN de supervisor para autorizar el retiro");
      }
    } else {
      throw new ForbiddenError("Se requiere PIN de supervisor para autorizar el retiro");
    }

    const expenseId = await shiftsRepository.insertShiftExpense({
      shiftId: activeShift.id,
      amount: parsedAmount,
      reason: cleanReason,
      authorizedBy: authorizedById,
    });

    const summary = await this.getShiftSummary(activeShift.id);

    return {
      ok: true,
      expenseId,
      message: "Retiro de caja chica registrado con éxito",
      summary,
    };
  },

  /**
   * Elimina un retiro de caja chica si el turno sigue abierto.
   */
  async deleteShiftExpense({ expenseId, centerId, authPin = null, session = null }) {
    const parsedExpenseId = Number(expenseId);
    if (!parsedExpenseId) throw new BadRequestError("expenseId inválido");

    const parsedCenterId = Number(centerId);
    if (!parsedCenterId) throw new BadRequestError("centerId es requerido");

    const activeShift = await shiftsRepository.findActiveShift(parsedCenterId);
    if (!activeShift) throw new BadRequestError("No hay turno abierto en este centro");

    if (authPin) {
      const ordersRepository = require("../orders/orders.repository");
      const authResult = await ordersRepository.findManagerOrAdminByPin(authPin);
      if (!authResult || !authResult.ok) {
        throw new ForbiddenError(authResult?.message || "PIN inválido o sin autorización");
      }
    } else if (session) {
      const role = String(session.role || "").toLowerCase();
      if (role !== "admin" && role !== "manager") {
        throw new ForbiddenError("Se requiere PIN de supervisor");
      }
    } else {
      throw new ForbiddenError("Se requiere PIN de supervisor");
    }

    await shiftsRepository.deleteShiftExpense(parsedExpenseId, activeShift.id);
    const summary = await this.getShiftSummary(activeShift.id);

    return {
      ok: true,
      message: "Retiro eliminado",
      summary,
    };
  },
};

module.exports = shiftsService;
