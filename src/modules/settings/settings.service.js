// src/modules/settings/settings.service.js
// Lógica de negocio para configuración global, perfiles, centros de operación, roles, usuarios y terminales

const fs = require("fs");
const path = require("path");
const settingsRepository = require("./settings.repository");
const { BadRequestError, NotFoundError, ConflictError } = require("../../common/errors");
const { normalizePaymentMethodCode } = require("../../common/utils");

// Importar servicio de impresión para diagnósticos
let printService = null;
try {
  printService = require("../../../server/print-service");
} catch (_) {
  try {
    printService = require("../../print-service");
  } catch (_) {}
}

const settingsService = {
  // Bootstrap & Full Settings
  async getBootstrap(ip) {
    return settingsRepository.getBootstrapData(ip);
  },

  async getFullSettings(currentIp) {
    return settingsRepository.getFullSettingsData(currentIp);
  },

  async getConfigData() {
    return settingsRepository.getConfigData();
  },

  // Branding & Assets
  async updateBranding(restaurantName) {
    const name = String(restaurantName || "").trim();
    if (!name) throw new BadRequestError("restaurantName es requerido");
    const trimmed = name.slice(0, 150);

    await settingsRepository.updateBusinessProfile({ restaurant_name: trimmed });
    await settingsRepository.setAppSetting("restaurant_name", trimmed);
    return { ok: true, restaurantName: trimmed };
  },

  async saveLogo(logoData, baseDir) {
    const raw = String(logoData || "").trim();
    if (!raw) throw new BadRequestError("logoData es requerido");

    const base64Match = raw.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,(.+)$/);
    if (!base64Match) {
      throw new BadRequestError("Formato de imagen inválido. Usa PNG, JPG, GIF, WebP o SVG.");
    }

    const ext = base64Match[1].replace("svg+xml", "svg");
    const fileName = `logo_${Date.now()}.${ext}`;
    const uploadsDir = path.join(baseDir || process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(base64Match[2], "base64");
    fs.writeFileSync(filePath, buffer);

    const logoUrl = `/uploads/${fileName}`;
    await settingsRepository.updateBusinessProfile({ logo_url: logoUrl });
    await settingsRepository.setAppSetting("logo_url", logoUrl);

    return { ok: true, logoUrl };
  },

  async saveLoginBg(bgData, baseDir) {
    const raw = String(bgData || "").trim();
    if (!raw) throw new BadRequestError("bgData es requerido");

    const base64Match = raw.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new BadRequestError("Formato de imagen inválido. Usa PNG, JPG, GIF o WebP.");
    }

    const ext = base64Match[1].replace("jpeg", "jpg");
    const fileName = `login_bg_${Date.now()}.${ext}`;
    const uploadsDir = path.join(baseDir || process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(base64Match[2], "base64");
    fs.writeFileSync(filePath, buffer);

    const loginBgUrl = `/uploads/${fileName}`;
    await settingsRepository.updateBusinessProfile({ login_bg_url: loginBgUrl });
    await settingsRepository.setAppSetting("login_bg_url", loginBgUrl);

    return { ok: true, loginBgUrl };
  },

  async updateTipConfig(tipPercent) {
    const pct = Number(tipPercent);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      throw new BadRequestError("tipPercent debe estar entre 0 y 100");
    }
    const rounded = Number(pct.toFixed(2));
    await settingsRepository.updateBusinessProfile({ tip_percent: rounded });
    await settingsRepository.setAppSetting("tip_percent", String(rounded));
    return { ok: true, tipPercent: rounded };
  },

  async getTipPercent() {
    return settingsRepository.getTipPercent();
  },

  async getBusinessProfile() {
    const profile = await settingsRepository.getBusinessProfile();
    return profile || {};
  },

  async updateBusinessProfile(data) {
    const { restaurant_name, phone, address, tax_id, currency_symbol, receipt_footer } = data || {};
    await settingsRepository.updateBusinessProfile({
      restaurant_name,
      phone,
      address,
      tax_id,
      currency_symbol,
      receipt_footer,
    });
    if (restaurant_name) {
      await settingsRepository.setAppSetting("restaurant_name", String(restaurant_name).trim().slice(0, 150));
    }
    const updated = await settingsRepository.getBusinessProfile();
    return { ok: true, profile: updated };
  },

  async getTipExcludedMethods() {
    const excludedMethods = await settingsRepository.getTipExcludedMethods();
    return { excludedMethods };
  },

  async updateTipExcludedMethods(excludedMethods = "cxc") {
    const list = Array.isArray(excludedMethods)
      ? excludedMethods.map(String)
      : String(excludedMethods).split(",").map((s) => s.trim()).filter(Boolean);

    await settingsRepository.setTipExcludedMethods(list);
    return { ok: true, excludedMethods: list };
  },

  // Modules
  async updateUserModules(userId, moduleCodes = []) {
    const uid = Number(userId || 0);
    if (!uid) throw new BadRequestError("userId es requerido");

    const modules = await settingsRepository.getActiveModules();
    const validCodes = modules.map((m) => String(m.code || "").trim());
    const selectedSet = new Set(
      (Array.isArray(moduleCodes) ? moduleCodes : [])
        .map((c) => String(c || "").trim())
        .filter((c) => validCodes.includes(c))
    );

    await settingsRepository.setUserModulePermissions(uid, validCodes, selectedSet);
    return { ok: true, userId: uid, enabledCount: selectedSet.size };
  },

  async updateDeviceModules(targetIp, moduleCodes = []) {
    const ip = String(targetIp || "").trim();
    if (!ip) throw new BadRequestError("ipAddress es requerido");

    const modules = await settingsRepository.getActiveModules();
    const validCodes = modules.map((m) => String(m.code || "").trim());
    const selectedSet = new Set(
      (Array.isArray(moduleCodes) ? moduleCodes : [])
        .map((c) => String(c || "").trim())
        .filter((c) => validCodes.includes(c))
    );

    await settingsRepository.setDeviceModuleBindings(ip, validCodes, selectedSet);
    return { ok: true, ipAddress: ip, enabledCount: selectedSet.size };
  },

  // Roles & Permissions
  async getRoles() {
    return settingsRepository.getRolesData();
  },

  async createRole({ name, slug, description }) {
    if (!name || !slug) throw new BadRequestError("name y slug son requeridos");
    const cleanSlug = String(slug).trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!cleanSlug) throw new BadRequestError("slug invalido");

    try {
      const id = await settingsRepository.createRole({
        name: String(name).trim(),
        slug: cleanSlug,
        description: String(description || "").trim(),
      });
      return { id, name: String(name).trim(), slug: cleanSlug };
    } catch (e) {
      if (String(e.message || "").includes("Duplicate")) {
        throw new ConflictError("Ya existe un rol con ese slug");
      }
      throw e;
    }
  },

  async updateRole(roleId, { name, description }) {
    const rid = Number(roleId);
    if (!rid || !name) throw new BadRequestError("roleId y name son requeridos");
    const existing = await settingsRepository.getRoleById(rid);
    if (!existing) throw new NotFoundError("Rol no encontrado");

    await settingsRepository.updateRole(rid, {
      name: String(name).trim(),
      description: String(description || "").trim(),
    });
    return { ok: true };
  },

  async deleteRole(roleId) {
    const rid = Number(roleId);
    if (!rid) throw new BadRequestError("roleId es requerido");
    const existing = await settingsRepository.getRoleById(rid);
    if (!existing) throw new NotFoundError("Rol no encontrado");
    if (Number(existing.is_system)) {
      throw new BadRequestError("No se puede eliminar un rol del sistema");
    }
    await settingsRepository.deleteRole(rid);
    return { ok: true };
  },

  async setRolePermissions(roleId, permissionIds) {
    const rid = Number(roleId);
    if (!rid || !Array.isArray(permissionIds)) {
      throw new BadRequestError("roleId y permissionIds son requeridos");
    }
    const existing = await settingsRepository.getRoleById(rid);
    if (!existing) throw new NotFoundError("Rol no encontrado");

    await settingsRepository.setRolePermissions(rid, permissionIds);
    return { ok: true };
  },

  async setUserRoles(userId, roleIds) {
    const uid = Number(userId);
    if (!uid || !Array.isArray(roleIds)) {
      throw new BadRequestError("userId y roleIds son requeridos");
    }
    await settingsRepository.setUserRoles(uid, roleIds);
    return { ok: true };
  },

  async getUserPermissions(userId) {
    return settingsRepository.getUserPermissions(Number(userId));
  },

  // Operation Centers
  async createOperationCenter({ name }) {
    if (!name || !String(name).trim()) throw new BadRequestError("name es requerido");
    const centerId = await settingsRepository.createOperationCenter(String(name).trim());
    return { centerId };
  },

  async updateOperationCenter(centerId, { name, isActive = 1 }) {
    const cid = Number(centerId);
    if (!cid || !name || !String(name).trim()) {
      throw new BadRequestError("centerId y name son requeridos");
    }
    await settingsRepository.updateOperationCenter(cid, {
      name: String(name).trim(),
      isActive,
    });
    return { ok: true };
  },

  async deleteOperationCenter(centerId) {
    const cid = Number(centerId);
    if (!cid) throw new BadRequestError("centerId es requerido");

    const hasAccounts = await settingsRepository.hasAccountsInCenter(cid);
    if (hasAccounts) {
      throw new BadRequestError("No se puede eliminar el centro porque tiene cuentas asociadas");
    }

    const hasTables = await settingsRepository.hasTablesInCenter(cid);
    if (hasTables) {
      throw new BadRequestError("No se puede eliminar el centro porque tiene mesas asociadas");
    }

    await settingsRepository.deleteOperationCenter(cid);
    return { ok: true };
  },

  async setOperationCenterProducts(centerId, productId, isEnabled = 1) {
    const cid = Number(centerId);
    const pid = Number(productId);
    if (!cid || !pid) throw new BadRequestError("centerId y productId son requeridos");
    await settingsRepository.setOperationCenterProducts(cid, pid, isEnabled);
    return { ok: true };
  },

  async setTerminalBinding(ipAddress, centerId, label = "") {
    const cid = Number(centerId);
    const ip = String(ipAddress || "").trim();
    if (!cid || !ip) throw new BadRequestError("centerId e ip son requeridos");
    await settingsRepository.setTerminalCenterBinding(ip, cid, label);
    return { ok: true, ip, centerId: cid };
  },

  // Payment Methods & Presets
  async getPaymentMethods() {
    return settingsRepository.getPaymentMethods(true);
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
    await settingsRepository.savePaymentMethod({
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
      throw new BadRequestError(`No se puede eliminar la forma de pago principal '${cleanCode}'. Puedes desactivarla si no deseas ofrecerla.`);
    }

    const hasPayments = await settingsRepository.hasPaymentsWithMethod(cleanCode);
    if (hasPayments) {
      throw new BadRequestError(`No se puede eliminar la forma de pago '${cleanCode}' porque tiene pagos registrados en el sistema. Puedes desactivarla.`);
    }

    await settingsRepository.deletePaymentMethod(cleanCode);
    return { ok: true, deleted: cleanCode };
  },

  async createDiscountPreset({ name, type, value = 0, isActive = 1, sortOrder = 0 }) {
    if (!name || !["percent", "fixed"].includes(type)) {
      throw new BadRequestError("name y type (percent|fixed) son requeridos");
    }
    await settingsRepository.createDiscountPreset({
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
    await settingsRepository.updateDiscountPreset(id, {
      name: String(name).trim(),
      type,
      value,
      isActive,
      sortOrder,
    });
    return { ok: true };
  },

  // Production Centers & Printers
  async getProductionCenters() {
    const centers = await settingsRepository.getProductionCenters();
    return { centers };
  },

  async createProductionCenter(data) {
    const { name, printerName = "", printerIp = "", printerPort = 9100, isActive = 1, operationCenterId = null } = data || {};
    if (!name || !String(name).trim()) throw new BadRequestError("name es requerido");
    const centerId = await settingsRepository.createProductionCenter({
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
    const { name, printerName = "", printerIp = "", printerPort = 9100, isActive = 1, operationCenterId = null } = data || {};
    if (!cid || !name || !String(name).trim()) throw new BadRequestError("centerId y name son requeridos");
    await settingsRepository.updateProductionCenter(cid, {
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
    const count = await settingsRepository.countProductsInProductionCenter(cid);
    if (count > 0) {
      throw new BadRequestError("No se puede eliminar el centro porque hay productos asignados. Desasigna los productos primero.");
    }
    await settingsRepository.deleteProductionCenter(cid);
    return { ok: true };
  },

  async testPrinter({ type, id }) {
    if (!type || !id) {
      throw new BadRequestError("type y id son requeridos (type: 'production_center' | 'terminal')");
    }
    let target = null;
    if (type === "production_center") {
      target = await settingsRepository.getProductionCenterById(Number(id));
    } else if (type === "terminal") {
      target = await settingsRepository.getTerminalById(Number(id));
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

  async getRecentPrintJobs(limit = 50) {
    const lim = Math.min(Number(limit || 50), 200);
    const jobs = await settingsRepository.getRecentPrintJobs(lim);
    return { jobs };
  },

  // Staff Users
  async createStaffUser({ fullName, pinCode, role = "waiter", operationCenterId = null }) {
    if (!fullName || !pinCode) throw new BadRequestError("fullName y pinCode son requeridos");
    if (await settingsRepository.checkDuplicatePin(pinCode)) {
      throw new ConflictError("Ya existe un usuario con ese PIN");
    }
    const userId = await settingsRepository.createStaffUser({
      fullName: String(fullName).trim(),
      pinCode: String(pinCode).trim(),
      role,
      operationCenterId: operationCenterId ? Number(operationCenterId) : null,
    });
    return { userId };
  },

  async updateStaffUser(userId, data) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestError("userId es requerido");
    const { fullName, pinCode, role, operationCenterId } = data || {};
    if (!fullName) throw new BadRequestError("fullName es requerido");

    if (pinCode && (await settingsRepository.checkDuplicatePin(pinCode, uid))) {
      throw new ConflictError("Ya existe otro usuario con ese PIN");
    }

    const fields = [];
    const params = [];
    if (fullName) {
      fields.push("full_name = ?");
      params.push(String(fullName).trim());
    }
    if (pinCode) {
      fields.push("pin_code = ?");
      params.push(String(pinCode).trim());
    }
    if (role) {
      fields.push("role = ?");
      params.push(role);
    }
    if (operationCenterId !== undefined) {
      fields.push("operation_center_id = ?");
      params.push(operationCenterId ? Number(operationCenterId) : null);
    }
    if (!fields.length) throw new BadRequestError("Sin datos para actualizar");

    params.push(uid);
    await settingsRepository.updateStaffUser(uid, fields, params);
    return { ok: true };
  },

  async deleteStaffUser(userId) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestError("userId es requerido");
    await settingsRepository.deleteStaffUser(uid);
    return { ok: true };
  },

  async setStaffUserCenter(userId, operationCenterId) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestError("userId es requerido");
    await settingsRepository.setStaffUserCenter(uid, operationCenterId);
    return { ok: true };
  },

  // Terminals
  async createTerminal(data) {
    const { operationCenterId, name, printerName = null, printerIp = null, printerPort = 9100, areaTrabajoId = null } = data || {};
    if (!operationCenterId || !name) throw new BadRequestError("operationCenterId y name son requeridos");
    const terminalId = await settingsRepository.createTerminal({
      operationCenterId,
      name: String(name).trim(),
      printerName,
      printerIp,
      printerPort,
      areaTrabajoId: areaTrabajoId ? Number(areaTrabajoId) : null,
    });
    return { terminalId };
  },

  async updateTerminal(terminalId, data) {
    const tid = Number(terminalId);
    const { operationCenterId, name, printerName, printerIp, printerPort = 9100, isActive = 1, areaTrabajoId = null } = data || {};
    if (!tid || !operationCenterId || !name) {
      throw new BadRequestError("terminalId, operationCenterId y name son requeridos");
    }
    await settingsRepository.updateTerminal(tid, {
      operationCenterId,
      name: String(name).trim(),
      printerName,
      printerIp,
      printerPort,
      isActive,
      areaTrabajoId: areaTrabajoId ? Number(areaTrabajoId) : null,
    });
    return { ok: true };
  },

  async deleteTerminal(terminalId) {
    const tid = Number(terminalId);
    if (!tid) throw new BadRequestError("terminalId es requerido");
    await settingsRepository.deleteTerminal(tid);
    return { ok: true };
  },

  // ───────── Matriz de Enrutamiento & Categorías de Impresión ─────────
  async getRoutingMatrix() {
    return settingsRepository.getRoutingMatrix();
  },

  async saveRoutingRule({ areaTrabajoId, categoriaImpresionId, centroProduccionId }) {
    if (!areaTrabajoId || !categoriaImpresionId || !centroProduccionId) {
      throw new BadRequestError("areaTrabajoId, categoriaImpresionId y centroProduccionId son requeridos");
    }
    await settingsRepository.saveRoutingRule(areaTrabajoId, categoriaImpresionId, centroProduccionId);
    return { ok: true };
  },

  async deleteRoutingRule(areaTrabajoId, categoriaImpresionId) {
    if (!areaTrabajoId || !categoriaImpresionId) {
      throw new BadRequestError("areaTrabajoId y categoriaImpresionId son requeridos");
    }
    await settingsRepository.deleteRoutingRule(areaTrabajoId, categoriaImpresionId);
    return { ok: true };
  },

  async getPrintCategories() {
    return settingsRepository.getPrintCategories();
  },

  async createPrintCategory({ nombre, descripcion }) {
    if (!nombre || !String(nombre).trim()) {
      throw new BadRequestError("nombre es requerido");
    }
    const id = await settingsRepository.createPrintCategory(nombre, descripcion);
    return { id, nombre };
  },

  async updatePrintCategory(id, { nombre, descripcion }) {
    const cid = Number(id);
    if (!cid || !nombre || !String(nombre).trim()) {
      throw new BadRequestError("id y nombre son requeridos");
    }
    await settingsRepository.updatePrintCategory(cid, nombre, descripcion);
    return { ok: true };
  },

  async deletePrintCategory(id) {
    const cid = Number(id);
    if (!cid) throw new BadRequestError("id es requerido");
    await settingsRepository.deletePrintCategory(cid);
    return { ok: true };
  },
};

module.exports = settingsService;
