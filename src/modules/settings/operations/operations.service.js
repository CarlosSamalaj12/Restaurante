// src/modules/settings/operations/operations.service.js
// Lógica de negocio para Centros de Operación, Terminales, Métodos de Pago, Descuentos y Notas de Cocina

const operationsRepository = require("./operations.repository");
const { BadRequestError } = require("../../../common/errors");
const { normalizePaymentMethodCode } = require("../../../common/utils");

const operationsService = {
  // ───────── Centros de Operación ─────────
  async createOperationCenter({ name }) {
    if (!name || !String(name).trim()) throw new BadRequestError("name es requerido");
    const centerId = await operationsRepository.createOperationCenter(String(name).trim());
    return { centerId };
  },

  async updateOperationCenter(centerId, { name, isActive }) {
    const cid = Number(centerId);
    if (!cid || !name || !String(name).trim()) {
      throw new BadRequestError("centerId y name son requeridos");
    }

    const wantsDeactivate =
      isActive !== undefined && (isActive === false || isActive === 0 || isActive === "0");
    if (wantsDeactivate) {
      const usage = await operationsRepository.getCenterUsageDetails(cid);
      if (usage.hasActiveOperations) {
        const parts = [];
        if (usage.openAccountsCount > 0) parts.push(`${usage.openAccountsCount} cuenta(s) abierta(s)`);
        if (usage.openShiftsCount > 0) parts.push(`${usage.openShiftsCount} turno(s) de caja abierto(s)`);
        throw new BadRequestError(
          `No se puede desactivar el centro porque tiene ${parts.join(" y ")} actualmente en curso. Cierra las operaciones activas primero.`
        );
      }
    }

    await operationsRepository.updateOperationCenter(cid, {
      name: String(name).trim(),
      isActive,
    });
    return { ok: true };
  },

  async getOperationCenterUsage(centerId) {
    const cid = Number(centerId);
    if (!cid) throw new BadRequestError("centerId es requerido");
    return operationsRepository.getCenterUsageDetails(cid);
  },

  async deleteOperationCenter(centerId) {
    const cid = Number(centerId);
    if (!cid) throw new BadRequestError("centerId es requerido");

    const usage = await operationsRepository.getCenterUsageDetails(cid);
    if (usage.hasLinkedData) {
      const reasons = [];
      if (usage.accountsCount > 0) reasons.push(`${usage.accountsCount} cuenta(s)`);
      if (usage.shiftsCount > 0) reasons.push(`${usage.shiftsCount} turno(s)`);
      if (usage.tablesCount > 0) reasons.push(`${usage.tablesCount} mesa(s)`);
      if (usage.usersCount > 0) reasons.push(`${usage.usersCount} usuario(s)`);
      if (usage.terminalsCount > 0) reasons.push(`${usage.terminalsCount} terminal(es)`);
      if (usage.categoriesCount > 0) reasons.push(`${usage.categoriesCount} categoría(s)`);
      if (usage.prodCentersCount > 0) reasons.push(`${usage.prodCentersCount} centro(s) de producción`);

      const err = new BadRequestError(
        `No se puede eliminar el centro porque tiene registros asociados (${reasons.join(", ")}). Desactívalo en su lugar para proteger la integridad histórica.`
      );
      err.canDeactivate = true;
      err.code = "CENTER_HAS_DEPENDENCIES";
      throw err;
    }

    await operationsRepository.deleteOperationCenter(cid);
    return { ok: true };
  },

  async setOperationCenterProducts(centerId, productId, isEnabled = 1) {
    const cid = Number(centerId);
    const pid = Number(productId);
    if (!cid || !pid) throw new BadRequestError("centerId y productId son requeridos");
    await operationsRepository.setOperationCenterProducts(cid, pid, isEnabled);
    return { ok: true };
  },

  async setTerminalBinding(ipAddress, centerId, label = "") {
    const cid = Number(centerId);
    const ip = String(ipAddress || "").trim();
    if (!cid || !ip) throw new BadRequestError("centerId e ip son requeridos");
    await operationsRepository.setTerminalCenterBinding(ip, cid, label);
    return { ok: true, ip, centerId: cid };
  },

  // ───────── Métodos de Pago & Presets ─────────
  async getPaymentMethods() {
    return operationsRepository.getPaymentMethods(true);
  },

  async savePaymentMethod({ code, label, isActive = 1, sortOrder = 0, appliesTip = 1, applies_tip }) {
    const normalizedCode = normalizePaymentMethodCode(code);
    const normalizedLabel = String(label || "").trim();
    if (!normalizedCode || !normalizedLabel) {
      throw new BadRequestError("code y label son requeridos");
    }
    if (normalizedCode.length > 30) {
      throw new BadRequestError("code maximo 30 caracteres");
    }
    const tipFlag = applies_tip !== undefined ? applies_tip : appliesTip;
    await operationsRepository.savePaymentMethod({
      code: normalizedCode,
      label: normalizedLabel,
      isActive,
      sortOrder,
      appliesTip: tipFlag !== undefined ? Number(tipFlag) : 1,
    });
    return { ok: true, code: normalizedCode };
  },

  async deletePaymentMethod(code) {
    const cleanCode = normalizePaymentMethodCode(code);
    if (!cleanCode) throw new BadRequestError("code es requerido");

    const protectedCodes = ["cash", "card", "cxc"];
    if (protectedCodes.includes(cleanCode)) {
      throw new BadRequestError(
        `No se puede eliminar la forma de pago principal '${cleanCode}'. Puedes desactivarla si no deseas ofrecerla.`
      );
    }

    const hasPayments = await operationsRepository.hasPaymentsWithMethod(cleanCode);
    if (hasPayments) {
      throw new BadRequestError(
        `No se puede eliminar la forma de pago '${cleanCode}' porque tiene pagos registrados en el sistema. Puedes desactivarla.`
      );
    }

    await operationsRepository.deletePaymentMethod(cleanCode);
    return { ok: true, deleted: cleanCode };
  },

  async createDiscountPreset({ name, type, value = 0, isActive = 1, sortOrder = 0 }) {
    if (!name || !["percent", "fixed"].includes(type)) {
      throw new BadRequestError("name y type (percent|fixed) son requeridos");
    }
    await operationsRepository.createDiscountPreset({
      name: String(name).trim(),
      type,
      value,
      isActive,
      sortOrder,
    });
    return { ok: true };
  },

  async updateDiscountPreset(presetId, { name, type, value = 0, isActive = 1, sortOrder = 0 }) {
    const id = Number(presetId);
    if (!id || !name || !["percent", "fixed"].includes(type)) {
      throw new BadRequestError("presetId, name y type (percent|fixed) son requeridos");
    }
    await operationsRepository.updateDiscountPreset(id, {
      name: String(name).trim(),
      type,
      value,
      isActive,
      sortOrder,
    });
    return { ok: true };
  },

  // ───────── Terminales ─────────
  async createTerminal(data) {
    const {
      operationCenterId,
      name,
      printerId = null,
      printerName = null,
      printerIp = null,
      printerPort = 9100,
      areaTrabajoId = null,
      isKds = 0,
      kdsProductionCenterId = null,
      kdsOperationCenterId = null,
      deviceSerial = null,
    } = data || {};
    if (!operationCenterId || !name) {
      throw new BadRequestError("operationCenterId y name son requeridos");
    }
    const terminalId = await operationsRepository.createTerminal({
      operationCenterId,
      name: String(name).trim(),
      printerId: printerId ? Number(printerId) : null,
      printerName,
      printerIp,
      printerPort,
      areaTrabajoId: areaTrabajoId ? Number(areaTrabajoId) : null,
      isKds: isKds ? 1 : 0,
      kdsProductionCenterId: kdsProductionCenterId ? Number(kdsProductionCenterId) : null,
      kdsOperationCenterId: kdsOperationCenterId ? Number(kdsOperationCenterId) : null,
      deviceSerial: deviceSerial ? String(deviceSerial).trim() : null,
    });
    return { terminalId };
  },

  async updateTerminal(terminalId, data) {
    const tid = Number(terminalId);
    const {
      operationCenterId,
      name,
      printerId = null,
      printerName,
      printerIp,
      printerPort = 9100,
      isActive = 1,
      areaTrabajoId = null,
      isKds = 0,
      kdsProductionCenterId = null,
      kdsOperationCenterId = null,
      deviceSerial = null,
    } = data || {};
    if (!tid || !operationCenterId || !name) {
      throw new BadRequestError("terminalId, operationCenterId y name son requeridos");
    }
    await operationsRepository.updateTerminal(tid, {
      operationCenterId,
      name: String(name).trim(),
      printerId: printerId ? Number(printerId) : null,
      printerName,
      printerIp,
      printerPort,
      isActive,
      areaTrabajoId: areaTrabajoId ? Number(areaTrabajoId) : null,
      isKds: isKds ? 1 : 0,
      kdsProductionCenterId: kdsProductionCenterId ? Number(kdsProductionCenterId) : null,
      kdsOperationCenterId: kdsOperationCenterId ? Number(kdsOperationCenterId) : null,
      deviceSerial: deviceSerial ? String(deviceSerial).trim() : null,
    });
    return { ok: true };
  },

  async deleteTerminal(terminalId) {
    const tid = Number(terminalId);
    if (!tid) throw new BadRequestError("terminalId es requerido");
    await operationsRepository.deleteTerminal(tid);
    return { ok: true };
  },

  // ───────── Observaciones y Atajos Rápidos de Cocina ─────────
  async getKitchenNotes({ activeOnly = false } = {}) {
    return operationsRepository.getKitchenNotes({ activeOnly });
  },

  async createKitchenNote(data) {
    const { label, category = "General", sortOrder = 0, isActive = 1 } = data || {};
    if (!label || !String(label).trim()) {
      throw new BadRequestError("label es requerido");
    }
    return operationsRepository.createKitchenNote({
      label: String(label).trim(),
      category: category ? String(category).trim() : "General",
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive ? 1 : 0,
    });
  },

  async updateKitchenNote(id, data) {
    const nid = Number(id);
    if (!nid) throw new BadRequestError("id es requerido");
    const { label, category, sortOrder, isActive } = data || {};
    if (label !== undefined && !String(label).trim()) {
      throw new BadRequestError("label no puede estar vacío");
    }
    await operationsRepository.updateKitchenNote(nid, {
      label: label !== undefined ? String(label).trim() : undefined,
      category: category !== undefined ? String(category).trim() : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      isActive: isActive !== undefined ? (isActive ? 1 : 0) : undefined,
    });
    return { ok: true };
  },

  async deleteKitchenNote(id) {
    const nid = Number(id);
    if (!nid) throw new BadRequestError("id es requerido");
    await operationsRepository.deleteKitchenNote(nid);
    return { ok: true };
  },
};

module.exports = operationsService;
