// src/modules/settings/staff/staff.service.js
// Lógica de negocio para Personal, Roles, Permisos y Asignación de Módulos

const staffRepository = require("./staff.repository");
const { query } = require("../../../common/db");
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require("../../../common/errors");
const { hashPin } = require("../../../common/pinHash");

const staffService = {
  // Modules
  async updateUserModules(userId, moduleCodes = []) {
    const uid = Number(userId || 0);
    if (!uid) throw new BadRequestError("userId es requerido");

    const modules = await staffRepository.getActiveModules();
    const validCodes = modules.map((m) => String(m.code || "").trim());
    const selectedSet = new Set(
      (Array.isArray(moduleCodes) ? moduleCodes : [])
        .map((c) => String(c || "").trim())
        .filter((c) => validCodes.includes(c))
    );

    await staffRepository.setUserModulePermissions(uid, validCodes, selectedSet);
    return { ok: true, userId: uid, enabledCount: selectedSet.size };
  },

  async updateDeviceModules(targetIp, moduleCodes = []) {
    const ip = String(targetIp || "").trim();
    if (!ip) throw new BadRequestError("ipAddress es requerido");

    const modules = await staffRepository.getActiveModules();
    const validCodes = modules.map((m) => String(m.code || "").trim());
    const selectedSet = new Set(
      (Array.isArray(moduleCodes) ? moduleCodes : [])
        .map((c) => String(c || "").trim())
        .filter((c) => validCodes.includes(c))
    );

    await staffRepository.setDeviceModuleBindings(ip, validCodes, selectedSet);
    return { ok: true, ipAddress: ip, enabledCount: selectedSet.size };
  },

  // Roles & Permissions
  async getRoles() {
    return staffRepository.getRolesData();
  },

  async createRole({ name, slug, description }) {
    if (!name || !slug) throw new BadRequestError("name y slug son requeridos");
    const cleanSlug = String(slug)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    if (!cleanSlug) throw new BadRequestError("slug invalido");

    try {
      const id = await staffRepository.createRole({
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
    const existing = await staffRepository.getRoleById(rid);
    if (!existing) throw new NotFoundError("Rol no encontrado");

    await staffRepository.updateRole(rid, {
      name: String(name).trim(),
      description: String(description || "").trim(),
    });
    return { ok: true };
  },

  async deleteRole(roleId) {
    const rid = Number(roleId);
    if (!rid) throw new BadRequestError("roleId es requerido");
    const existing = await staffRepository.getRoleById(rid);
    if (!existing) throw new NotFoundError("Rol no encontrado");
    if (Number(existing.is_system)) {
      throw new BadRequestError("No se puede eliminar un rol del sistema");
    }
    await staffRepository.deleteRole(rid);
    return { ok: true };
  },

  async setRolePermissions(roleId, permissionIds, defaultView = null) {
    const rid = Number(roleId);
    if (!rid || !Array.isArray(permissionIds)) {
      throw new BadRequestError("roleId y permissionIds son requeridos");
    }
    const existing = await staffRepository.getRoleById(rid);
    if (!existing) throw new NotFoundError("Rol no encontrado");

    await staffRepository.setRolePermissions(rid, permissionIds);
    if (defaultView) {
      await staffRepository.updateRoleDefaultView(rid, defaultView);
    }
    return { ok: true };
  },

  async setUserRoles(userId, roleIds) {
    const uid = Number(userId);
    if (!uid || !Array.isArray(roleIds)) {
      throw new BadRequestError("userId y roleIds son requeridos");
    }

    const [userRows] = await query("SELECT role FROM staff_users WHERE id = ?", [uid]);
    const isCurrentSuper =
      userRows?.[0] && String(userRows[0].role).toLowerCase() === "superadmin";

    let newRolesIncludeSuper = false;
    if (roleIds.length > 0) {
      const [superRoleRows] = await query(
        `SELECT id FROM roles WHERE slug = 'superadmin' AND id IN (${roleIds.map(() => "?").join(",")})`,
        roleIds.map((r) => Number(r))
      );
      if (superRoleRows && superRoleRows.length > 0) {
        newRolesIncludeSuper = true;
      }
    }

    if (isCurrentSuper && !newRolesIncludeSuper) {
      const [superCount] = await query(
        "SELECT COUNT(*) as count FROM staff_users WHERE role = 'superadmin' AND id != ?",
        [uid]
      );
      if (Number(superCount?.[0]?.count || 0) === 0) {
        throw new ForbiddenError("No puedes degradar al único Superadministrador del sistema");
      }
    }

    await staffRepository.setUserRoles(uid, roleIds);

    if (roleIds.length > 0) {
      const [roleRows] = await query(
        `SELECT slug FROM roles WHERE id IN (${roleIds.map(() => "?").join(",")})`,
        roleIds.map((r) => Number(r))
      );
      const slugs = (roleRows || []).map((r) => String(r.slug).toLowerCase());
      let primaryRole = "waiter";
      if (slugs.includes("superadmin")) primaryRole = "superadmin";
      else if (slugs.includes("admin") || slugs.includes("administrador")) primaryRole = "admin";
      else if (slugs.includes("manager") || slugs.includes("gerente")) primaryRole = "manager";
      else if (slugs.includes("cashier") || slugs.includes("cajero")) primaryRole = "cashier";
      else if (slugs[0]) primaryRole = slugs[0];

      await query("UPDATE staff_users SET role = ? WHERE id = ?", [primaryRole, uid]);
    }

    return { ok: true };
  },

  async getUserPermissions(userId) {
    return staffRepository.getUserPermissions(Number(userId));
  },

  // Staff Users
  async createStaffUser({ fullName, pinCode, role = "waiter", operationCenterId = null }) {
    if (!fullName || !pinCode) throw new BadRequestError("fullName y pinCode son requeridos");
    const cleanPin = String(pinCode).trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      throw new BadRequestError("El PIN debe tener exactamente 6 dígitos numéricos");
    }
    const hashedPin = hashPin(cleanPin);
    if (await staffRepository.checkDuplicatePin(hashedPin)) {
      throw new ConflictError("Ya existe un usuario con ese PIN");
    }
    const userId = await staffRepository.createStaffUser({
      fullName: String(fullName).trim(),
      pinCode: hashedPin,
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

    let hashedPin = null;
    if (pinCode && String(pinCode).trim() && !String(pinCode).includes("•")) {
      const cleanPin = String(pinCode).trim();
      if (!/^\d{6}$/.test(cleanPin)) {
        throw new BadRequestError("El PIN debe tener exactamente 6 dígitos numéricos");
      }
      hashedPin = hashPin(cleanPin);
      if (await staffRepository.checkDuplicatePin(hashedPin, uid)) {
        throw new ConflictError("Ya existe otro usuario con ese PIN");
      }
    }

    const fields = [];
    const params = [];
    if (fullName) {
      fields.push("full_name = ?");
      params.push(String(fullName).trim());
    }
    if (hashedPin) {
      fields.push("pin_code = ?");
      params.push(hashedPin);
    }
    if (role) {
      if (role !== "superadmin") {
        const [u] = await query("SELECT role FROM staff_users WHERE id = ?", [uid]);
        if (u?.[0] && String(u[0].role).toLowerCase() === "superadmin") {
          const [superCount] = await query(
            "SELECT COUNT(*) as count FROM staff_users WHERE role = 'superadmin' AND id != ?",
            [uid]
          );
          if (Number(superCount?.[0]?.count || 0) === 0) {
            throw new ForbiddenError("No puedes degradar al único Superadministrador del sistema");
          }
        }
      }
      fields.push("role = ?");
      params.push(role);
    }
    if (operationCenterId !== undefined) {
      fields.push("operation_center_id = ?");
      params.push(operationCenterId ? Number(operationCenterId) : null);
    }
    if (!fields.length) throw new BadRequestError("Sin datos para actualizar");

    params.push(uid);
    await staffRepository.updateStaffUser(uid, fields, params);
    return { ok: true };
  },

  async deleteStaffUser(userId) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestError("userId es requerido");
    const [userRows] = await query("SELECT id, role FROM staff_users WHERE id = ?", [uid]);
    if (userRows?.[0] && String(userRows[0].role).toLowerCase() === "superadmin") {
      throw new ForbiddenError("No se puede eliminar un usuario con rol Superadministrador");
    }
    await staffRepository.deleteStaffUser(uid);
    return { ok: true };
  },

  async setStaffUserCenter(userId, operationCenterId) {
    const uid = Number(userId);
    if (!uid) throw new BadRequestError("userId es requerido");
    await staffRepository.setStaffUserCenter(uid, operationCenterId);
    return { ok: true };
  },
};

module.exports = staffService;
