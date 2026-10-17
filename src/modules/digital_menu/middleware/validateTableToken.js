// src/modules/digital_menu/middleware/validateTableToken.js
// Validación criptográfica HMAC-SHA256 de tokens QR/NFC y control de activación de módulo Premium

const crypto = require("crypto");
const digitalMenuRepository = require("../digital_menu.repository");
const { ForbiddenError, NotFoundError } = require("../../../common/errors");

const HMAC_SECRET = process.env.QR_HMAC_SECRET || "sama_pos_qr_secure_token_secret_2026_xyz!";

function generateTableToken(tableId, menuId, salt) {
  const payload = `${tableId}:${menuId}:${salt}`;
  return crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("hex");
}

function generateRandomSalt() {
  return crypto.randomBytes(16).toString("hex");
}

async function validateTableToken(req, res, next) {
  try {
    // 1. Validar si el módulo Premium está encendido por el Superadmin
    const isEnabled = await digitalMenuRepository.isModuleEnabled();
    if (!isEnabled) {
      throw new ForbiddenError(
        "El servicio de Menú Digital y Auto-Comanda no está activado en este establecimiento. Contacta al administrador."
      );
    }

    const rawToken = String(req.query.t || req.headers["x-table-token"] || "").trim();
    if (!rawToken) {
      // Modo General (Kiosco o Catálogo sin número de mesa asignado)
      req.tableContext = null;
      return next();
    }

    // 2. Buscar token en DB
    const tableData = await digitalMenuRepository.findTableByTokenHash(rawToken);
    if (!tableData) {
      throw new ForbiddenError("El código QR escaneado es inválido o ha sido revocado.");
    }

    if (!tableData.table_is_active) {
      throw new ForbiddenError(`La Mesa ${tableData.table_code} se encuentra temporalmente fuera de servicio.`);
    }

    // 3. Validar integridad criptográfica
    const expectedHash = generateTableToken(tableData.table_id, tableData.menu_id, tableData.salt);
    if (expectedHash !== rawToken) {
      throw new ForbiddenError("Firma de seguridad de mesa alterada o inválida.");
    }

    req.tableContext = {
      tableId: Number(tableData.table_id),
      tableCode: tableData.table_code,
      operationCenterId: Number(tableData.operation_center_id || 0),
      menuId: Number(tableData.menu_id),
      menuSlug: tableData.menu_slug,
      menuMode: tableData.menu_mode,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  validateTableToken,
  generateTableToken,
  generateRandomSalt,
};
