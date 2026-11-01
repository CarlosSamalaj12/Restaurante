// src/modules/settings/printers/printers.service.js
// Lógica de negocio para Impresoras, Centros de Producción, Diagnósticos, Matriz de Ruteo y Categorías

const printersRepository = require("./printers.repository");
const {
  BadRequestError,
  NotFoundError,
} = require("../../../common/errors");

// Importar servicio de impresión para diagnósticos y pruebas de hardware
let printService = null;
try {
  printService = require("../../../../server/print-service");
} catch (_) {
  try {
    printService = require("../../../print-service");
  } catch (_) {}
}

const printersService = {
  // ───────── Production Centers ─────────
  async getProductionCenters() {
    const centers = await printersRepository.getProductionCenters();
    return { centers };
  },

  async createProductionCenter(data) {
    const {
      name,
      printerName = "",
      printerIp = "",
      printerPort = 9100,
      isActive = 1,
      operationCenterId = null,
    } = data || {};
    if (!name || !String(name).trim()) throw new BadRequestError("name es requerido");
    const centerId = await printersRepository.createProductionCenter({
      name: String(name).trim(),
      printerName: String(printerName).trim(),
      printerIp: printerIp ? String(printerIp).trim() : null,
      printerPort,
      isActive,
      operationCenterId: operationCenterId ? Number(operationCenterId) : null,
    });
    return { centerId };
  },

  async updateProductionCenter(centerId, data) {
    const cid = Number(centerId);
    const {
      name,
      printerName = "",
      printerIp = "",
      printerPort = 9100,
      isActive = 1,
      operationCenterId = null,
    } = data || {};
    if (!cid || !name || !String(name).trim()) {
      throw new BadRequestError("centerId y name son requeridos");
    }
    await printersRepository.updateProductionCenter(cid, {
      name: String(name).trim(),
      printerName: String(printerName).trim(),
      printerIp: printerIp ? String(printerIp).trim() : null,
      printerPort,
      isActive,
      operationCenterId: operationCenterId ? Number(operationCenterId) : null,
    });
    return { ok: true };
  },

  async deleteProductionCenter(centerId) {
    const cid = Number(centerId);
    if (!cid) throw new BadRequestError("centerId es requerido");
    const count = await printersRepository.countProductsInProductionCenter(cid);
    if (count > 0) {
      throw new BadRequestError(
        "No se puede eliminar el centro porque hay productos asignados. Desasigna los productos primero."
      );
    }
    await printersRepository.deleteProductionCenter(cid);
    return { ok: true };
  },

  async testPrinter({ type, id }) {
    if (!type || !id) {
      throw new BadRequestError("type y id son requeridos (type: 'production_center' | 'terminal')");
    }
    let target = null;
    if (type === "production_center") {
      target = await printersRepository.getProductionCenterById(Number(id));
    } else if (type === "terminal") {
      target = await printersRepository.getTerminalById(Number(id));
    } else {
      throw new BadRequestError("type invalido");
    }

    if (!target) throw new NotFoundError("Destino no encontrado");
    if (!target.printer_ip) {
      throw new BadRequestError("Esta impresora no tiene IP configurada. Configurala primero.");
    }

    if (!printService) {
      throw new BadRequestError("Servicio de impresión no disponible en este entorno");
    }

    const result = await printService.printTestPage(target);
    if (result.ok) {
      return { ok: true, message: "Pagina de prueba enviada", attempts: result.attempts };
    }
    throw new BadRequestError(result.error || "No se pudo imprimir");
  },

  getPrintersStatus() {
    if (printService && typeof printService.getStatus === "function") {
      return printService.getStatus();
    }
    return { status: "offline", printers: [] };
  },

  async getPrinterRoutingMode() {
    const mode = await printersRepository.getAppSetting("print_routing_mode");
    return { mode: mode || "auto" };
  },

  async setPrinterRoutingMode(mode) {
    const validModes = ["auto", "direct", "agent"];
    const normalized = String(mode || "").toLowerCase().trim();
    if (!validModes.includes(normalized)) {
      throw new BadRequestError("Modo de impresión inválido. Debe ser: auto, direct o agent");
    }
    await printersRepository.setAppSetting("print_routing_mode", normalized);
    if (printService && typeof printService.setRoutingMode === "function") {
      printService.setRoutingMode(normalized);
    }
    return { ok: true, mode: normalized };
  },

  async getRecentPrintJobs(limit = 50) {
    const lim = Math.min(Number(limit || 50), 200);
    const jobs = await printersRepository.getRecentPrintJobs(lim);
    return { jobs };
  },

  // ───────── Gestión Centralizada de Impresoras ─────────
  async getPrinters() {
    const printers = await printersRepository.getPrinters();
    return { printers };
  },

  async createPrinter(data) {
    const {
      name,
      ip,
      port = 9100,
      type = "production",
      paperWidth = "80mm",
      isActive = 1,
      description = "",
    } = data || {};
    if (!name || !String(name).trim()) {
      throw new BadRequestError("El nombre de la impresora es requerido");
    }
    if (!ip || !String(ip).trim()) {
      throw new BadRequestError("La dirección IP es requerida");
    }

    const printerId = await printersRepository.createPrinter({
      name: String(name).trim(),
      ip: String(ip).trim(),
      port: Number(port) || 9100,
      type,
      paperWidth,
      isActive: Number(isActive) ? 1 : 0,
      description: description ? String(description).trim() : null,
    });
    return { printerId, ok: true };
  },

  async updatePrinter(printerId, data) {
    const pid = Number(printerId);
    if (!pid) throw new BadRequestError("ID de impresora inválido");
    const {
      name,
      ip,
      port = 9100,
      type = "production",
      paperWidth = "80mm",
      isActive = 1,
      description = "",
    } = data || {};
    if (!name || !String(name).trim()) {
      throw new BadRequestError("El nombre de la impresora es requerido");
    }
    if (!ip || !String(ip).trim()) {
      throw new BadRequestError("La dirección IP es requerida");
    }

    await printersRepository.updatePrinter(pid, {
      name: String(name).trim(),
      ip: String(ip).trim(),
      port: Number(port) || 9100,
      type,
      paperWidth,
      isActive: Number(isActive) ? 1 : 0,
      description: description ? String(description).trim() : null,
    });
    return { ok: true };
  },

  async deletePrinter(printerId) {
    const pid = Number(printerId);
    if (!pid) throw new BadRequestError("ID de impresora inválido");
    await printersRepository.deletePrinter(pid);
    return { ok: true };
  },

  async testPrinterDirect(printerId) {
    const pid = Number(printerId);
    if (!pid) throw new BadRequestError("ID de impresora inválido");

    const printer = await printersRepository.getPrinterById(pid);
    if (!printer) throw new NotFoundError("Impresora no encontrada");
    if (!printer.ip) throw new BadRequestError("La impresora no tiene IP configurada");

    if (!printService) {
      throw new BadRequestError("Servicio de impresión no disponible en este entorno");
    }

    const target = {
      name: printer.name,
      printer_name: printer.name,
      printer_ip: printer.ip,
      printer_port: printer.port || 9100,
    };

    const result = await printService.printTestPage(target);
    if (result.ok) {
      return { ok: true, message: "Página de prueba enviada con éxito", attempts: result.attempts };
    }
    throw new BadRequestError(result.error || "No se pudo comunicar con la impresora");
  },

  async auditPrinters() {
    const auditData = await printersRepository.auditPrintersConfiguration();
    const serviceStatus = this.getPrintersStatus();
    return {
      ...auditData,
      serviceStatus,
    };
  },

  // ───────── Matriz de Enrutamiento & Categorías de Impresión ─────────
  async getRoutingMatrix() {
    return printersRepository.getRoutingMatrix();
  },

  async saveRoutingRule({ areaTrabajoId, categoriaImpresionId, centroProduccionId }) {
    if (!areaTrabajoId || !categoriaImpresionId || !centroProduccionId) {
      throw new BadRequestError(
        "areaTrabajoId, categoriaImpresionId y centroProduccionId son requeridos"
      );
    }
    await printersRepository.saveRoutingRule(
      areaTrabajoId,
      categoriaImpresionId,
      centroProduccionId
    );
    return { ok: true };
  },

  async deleteRoutingRule(areaTrabajoId, categoriaImpresionId) {
    if (!areaTrabajoId || !categoriaImpresionId) {
      throw new BadRequestError("areaTrabajoId y categoriaImpresionId son requeridos");
    }
    await printersRepository.deleteRoutingRule(areaTrabajoId, categoriaImpresionId);
    return { ok: true };
  },

  async getPrintCategories() {
    return printersRepository.getPrintCategories();
  },

  async createPrintCategory({ nombre, descripcion }) {
    if (!nombre || !String(nombre).trim()) {
      throw new BadRequestError("nombre es requerido");
    }
    const id = await printersRepository.createPrintCategory(nombre, descripcion);
    return { id, nombre };
  },

  async updatePrintCategory(id, { nombre, descripcion }) {
    const cid = Number(id);
    if (!cid || !nombre || !String(nombre).trim()) {
      throw new BadRequestError("id y nombre son requeridos");
    }
    await printersRepository.updatePrintCategory(cid, nombre, descripcion);
    return { ok: true };
  },

  async deletePrintCategory(id) {
    const cid = Number(id);
    if (!cid) throw new BadRequestError("id es requerido");
    await printersRepository.deletePrintCategory(cid);
    return { ok: true };
  },
};

module.exports = printersService;
