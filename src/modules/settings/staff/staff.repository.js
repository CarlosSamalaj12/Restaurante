// src/modules/settings/staff/staff.repository.js
// Capa de acceso a datos (MariaDB) para Personal, Roles, Permisos y Módulos

const { query } = require("../../../common/db");

const staffRepository = {
  // Modules & Permissions
  async getActiveModules() {
    const [rows] = await query(
      `SELECT code, label, is_active, sort_order FROM app_modules WHERE is_active = 1 ORDER BY sort_order, code`
    );
    return rows;
  },

  async setUserModulePermissions(userId, validCodes, selectedSet) {
    for (const code of validCodes) {
      await query(
        `INSERT INTO user_module_permissions (user_id, module_code, is_enabled)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
        [userId, code, selectedSet.has(code) ? 1 : 0]
      );
    }
  },

  async setDeviceModuleBindings(targetIp, validCodes, selectedSet) {
    for (const code of validCodes) {
      await query(
        `INSERT INTO terminal_module_bindings (ip_address, module_code, is_enabled)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
        [targetIp, code, selectedSet.has(code) ? 1 : 0]
      );
    }
  },

  // Roles & Permissions
  async getRolesData() {
    const [roles] = await query(
      `SELECT id, name, slug, description, is_system, default_view FROM roles ORDER BY id`
    );
    const [permissions] = await query(
      `SELECT id, name, slug, module_code, description FROM permissions ORDER BY module_code, id`
    );
    const [rolePerms] = await query(`SELECT role_id, permission_id FROM role_permissions`);
    const [userRoles] = await query(`SELECT user_id, role_id FROM user_roles`);

    const permByRole = {};
    for (const rp of rolePerms) {
      const rid = Number(rp.role_id);
      if (!permByRole[rid]) permByRole[rid] = [];
      permByRole[rid].push(Number(rp.permission_id));
    }

    const rolesByUser = {};
    for (const ur of userRoles) {
      const uid = Number(ur.user_id);
      if (!rolesByUser[uid]) rolesByUser[uid] = [];
      rolesByUser[uid].push(Number(ur.role_id));
    }

    return { roles, permissions, permByRole, rolesByUser };
  },

  async createRole({ name, slug, description, defaultView = "dashboard" }) {
    const [r] = await query(
      `INSERT INTO roles (name, slug, description, default_view) VALUES (?, ?, ?, ?)`,
      [name, slug, description, defaultView]
    );
    return r.insertId;
  },

  async getRoleById(roleId) {
    const [rows] = await query(
      `SELECT id, name, slug, description, is_system, default_view FROM roles WHERE id = ? LIMIT 1`,
      [roleId]
    );
    return rows[0] || null;
  },

  async updateRole(roleId, { name, description, defaultView }) {
    if (defaultView) {
      await query(
        `UPDATE roles SET name = ?, description = ?, default_view = ? WHERE id = ?`,
        [name, description, defaultView, roleId]
      );
    } else {
      await query(
        `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
        [name, description, roleId]
      );
    }
  },

  async updateRoleDefaultView(roleId, defaultView) {
    if (!defaultView) return;
    await query(`UPDATE roles SET default_view = ? WHERE id = ?`, [defaultView, roleId]);
  },

  async deleteRole(roleId) {
    await query(`DELETE FROM user_roles WHERE role_id = ?`, [roleId]);
    await query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
    await query(`DELETE FROM roles WHERE id = ?`, [roleId]);
  },

  async setRolePermissions(roleId, permissionIds) {
    await query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
    for (const pid of permissionIds) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [roleId, Number(pid)]
      );
    }
  },

  async setUserRoles(userId, roleIds) {
    await query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
    for (const rid of roleIds) {
      await query(
        `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [userId, Number(rid)]
      );
    }
  },

  async getUserPermissions(userId) {
    const [rows] = await query(
      `SELECT DISTINCT p.slug
       FROM user_roles ur
       INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ?`,
      [userId]
    );
    return rows.map((r) => r.slug);
  },

  // Staff Users
  async checkDuplicatePin(pinCode, excludeUserId = null) {
    if (!pinCode) return false;
    const [rows] = await query(
      `SELECT id FROM staff_users WHERE pin_code = ? AND (? IS NULL OR id != ?) LIMIT 1`,
      [String(pinCode).trim(), excludeUserId || null, excludeUserId || null]
    );
    return rows.length > 0;
  },

  async createStaffUser({ fullName, pinCode, role = "waiter", operationCenterId = null }) {
    const [result] = await query(
      `INSERT INTO staff_users (full_name, pin_code, role, operation_center_id) VALUES (?, ?, ?, ?)`,
      [fullName, pinCode, role, operationCenterId ? Number(operationCenterId) : null]
    );
    return result.insertId;
  },

  async updateStaffUser(userId, fields, params) {
    await query(`UPDATE staff_users SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async deleteStaffUser(userId) {
    await query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
    await query(`DELETE FROM user_module_permissions WHERE user_id = ?`, [userId]);
    await query(`DELETE FROM staff_users WHERE id = ?`, [userId]);
  },

  async setStaffUserCenter(userId, operationCenterId) {
    await query(
      `UPDATE staff_users SET operation_center_id = ? WHERE id = ?`,
      [operationCenterId ? Number(operationCenterId) : null, userId]
    );
  },
};

module.exports = staffRepository;
