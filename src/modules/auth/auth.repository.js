// src/modules/auth/auth.repository.js
// Consultas SQL puras a MariaDB para autenticación, roles y sesiones

const { query } = require("../../common/db");

const authRepository = {
  async findUserByPin(pin) {
    const [rows] = await query(
      `SELECT id, full_name, role, operation_center_id
       FROM staff_users
       WHERE pin_code = ?
       LIMIT 1`,
      [pin]
    );
    return rows[0] || null;
  },

  async findUserById(id) {
    const [rows] = await query(
      `SELECT id, full_name, role, operation_center_id
       FROM staff_users
       WHERE id = ?
       LIMIT 1`,
      [Number(id)]
    );
    return rows[0] || null;
  },

  async insertSession({ token, userId, role, permissionsJson, expiresAt, ip, userAgent }) {
    await query(
      `INSERT INTO auth_sessions (token, user_id, role, permissions_json, expires_at, created_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, FROM_UNIXTIME(?/1000), NOW(), ?, ?)`,
      [
        token,
        userId,
        role,
        permissionsJson,
        expiresAt,
        String(ip || null).slice(0, 45) || null,
        String(userAgent || null).slice(0, 255) || null,
      ]
    );
  },

  async findSessionByToken(token) {
    const [rows] = await query(
      `SELECT user_id, role, permissions_json, UNIX_TIMESTAMP(expires_at)*1000 AS expires_ms
       FROM auth_sessions WHERE token = ? LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  },

  async deleteSessionByToken(token) {
    await query("DELETE FROM auth_sessions WHERE token = ?", [token]);
  },

  async deleteExpiredSessions() {
    return query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
  },

  async getUserPermissions(userId) {
    const [rows] = await query(
      `SELECT DISTINCT p.slug
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = ?
       ORDER BY p.slug`,
      [Number(userId)]
    );
    return rows.map((r) => String(r.slug));
  },

  async getActiveModules() {
    const [rows] = await query(
      `SELECT code, label, is_active, sort_order
       FROM app_modules
       WHERE is_active = 1
       ORDER BY sort_order, code`
    );
    return rows;
  },

  async getUserEnabledModuleCodes(userId) {
    const [rows] = await query(
      `SELECT module_code, is_enabled
       FROM user_module_permissions
       WHERE user_id = ?`,
      [Number(userId)]
    );
    return rows;
  },

  async getDeviceEnabledModuleCodes(ip) {
    const [rows] = await query(
      `SELECT module_code, is_enabled
       FROM terminal_module_bindings
       WHERE ip_address = ?`,
      [String(ip || "").trim()]
    );
    return rows;
  },
};

module.exports = authRepository;
