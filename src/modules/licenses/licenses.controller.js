// src/modules/licenses/licenses.controller.js
// Controlador para licenciamiento y terminales autorizadas

const licenseService = require("../../license");
const authService = require("../auth/auth.service");
const authRepository = require("../auth/auth.repository");
const { query } = require("../../common/db");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../../common/errors");
const { clientIp } = require("../../common/utils");

const licensesController = {
  enroll: licenseService.enroll,
  heartbeat: licenseService.heartbeat,
  status: licenseService.status,

  listLicenses: licenseService.listLicenses,
  createLicense: licenseService.createLicense,
  revokeLicense: licenseService.revokeLicense,

  listTerminals: licenseService.listTerminals,
  approveTerminal: licenseService.approveTerminal,
  revokeTerminal: licenseService.revokeTerminal,
  replaceTerminal: licenseService.replaceTerminal,
  async updateTerminal(req, res) {
    const id = Number(req.params.id);
    if (!id) throw new BadRequestError("id inválido");
    const label = req.body?.label !== undefined ? String(req.body.label).trim().slice(0, 255) : null;
    const terminalType = req.body?.terminal_type ? String(req.body.terminal_type).trim() : null;
    if (terminalType && !["pos", "kds"].includes(terminalType)) {
      throw new BadRequestError("terminal_type debe ser 'pos' o 'kds'");
    }
    const updated = await licenseService.updateTerminal(id, { label, terminalType }, req.authUser?.id);
    if (!updated) throw new NotFoundError("Terminal no encontrada");
    res.json({ ok: true, terminal: updated });
  },
  getAuditLog: licenseService.getAuditLog,

  async adminSelfApprove(req, res) {
    const pin = String(req.body?.pin || "").trim();
    const serial = String(req.body?.serial || "").trim();

    if (!/^\d{4,}$/.test(pin)) {
      throw new BadRequestError("PIN inválido (debe ser numérico, 4+ dígitos)");
    }
    if (!serial || serial.length < 8) {
      throw new BadRequestError("Serial inválido");
    }

    // 1) Verificar que el PIN sea de un admin
    const user = await authRepository.findUserByPin(pin);
    if (!user || user.role !== "admin") {
      throw new ForbiddenError("PIN incorrecto o no pertenece a un administrador");
    }

    // 2) Buscar la terminal
    const [termRows] = await query(
      `SELECT id, license_id, status FROM licensed_terminals WHERE serial = ? LIMIT 1`,
      [serial]
    );
    if (!termRows.length) {
      throw new NotFoundError("Terminal no registrada. Recarga la página para registrarla.");
    }
    const terminal = termRows[0];
    if (terminal.status === "active") {
      // Ya activa, simplemente loguear al admin
      const ip = clientIp(req);
      const allowedModules = await authService.getAllowedModulesForContext(user, ip);
      const authToken = await authService.createAuthSession(user, {
        ip,
        userAgent: req.headers["user-agent"],
      });
      return res.json({ ok: true, alreadyActive: true, authToken, user, allowedModules });
    }
    if (terminal.status !== "pending") {
      throw new ForbiddenError(`Terminal en estado '${terminal.status}'. Solo se pueden aprobar terminales pendientes.`);
    }

    // 3) Buscar una licencia activa con cupo disponible
    const [licRows] = await query(
      `SELECT l.id, l.max_terminals,
              (SELECT COUNT(*) FROM licensed_terminals lt WHERE lt.license_id = l.id AND lt.status = 'active') AS active_count
       FROM licenses l
       WHERE l.status = 'active'
         AND (l.valid_until IS NULL OR l.valid_until > NOW())
       ORDER BY l.id ASC
       LIMIT 1`
    );
    if (!licRows.length) {
      throw new ForbiddenError("No hay licencias activas en el sistema para asociar a esta terminal.");
    }
    const lic = licRows[0];
    if (Number(lic.max_terminals) > 0 && Number(lic.active_count) >= Number(lic.max_terminals)) {
      throw new ForbiddenError(`La licencia alcanzó su cupo máximo de terminales (${lic.active_count}/${lic.max_terminals}).`);
    }

    const licenseId = lic.id;

    // 4) Aprobar la terminal
    await query(
      `UPDATE licensed_terminals
       SET status = 'active',
           license_id = ?,
           approved_at = NOW(),
           approved_by_user_id = ?
       WHERE id = ?`,
      [licenseId, user.id, terminal.id]
    );

    // 5) Registrar auditoría
    await query(
      `INSERT INTO license_audit (actor_user_id, terminal_id, license_id, action, details)
       VALUES (?, ?, ?, 'terminal.approved', ?)`,
      [user.id, terminal.id, licenseId, JSON.stringify({ via: "admin-self-approve" })]
    );

    // 6) Iniciar sesión del admin
    const ip = clientIp(req);
    const allowedModules = await authService.getAllowedModulesForContext(user, ip);
    const authToken = await authService.createAuthSession(user, {
      ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      ok: true,
      message: "Terminal aprobada con éxito",
      authToken,
      user,
      allowedModules,
    });
  },
};

module.exports = licensesController;
