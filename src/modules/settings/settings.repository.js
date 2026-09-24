// src/modules/settings/settings.repository.js
// Repositorio de consultas SQL puras para configuración, perfiles, roles, centros y terminales

const { query } = require("../../common/db");

const settingsRepository = {
  // Business Profile & App Settings
  async getBusinessProfile() {
    try {
      const [rows] = await query(`SELECT * FROM business_profile ORDER BY id ASC LIMIT 1`);
      if (rows && rows[0]) return rows[0];
    } catch (_) {}
    return null;
  },

  async updateBusinessProfile({ restaurant_name, phone, address, tax_id, currency_symbol, receipt_footer, tip_percent, logo_url, login_bg_url }) {
    await query(
      `UPDATE business_profile
       SET restaurant_name = COALESCE(?, restaurant_name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           tax_id = COALESCE(?, tax_id),
           currency_symbol = COALESCE(?, currency_symbol),
           receipt_footer = COALESCE(?, receipt_footer),
           tip_percent = COALESCE(?, tip_percent),
           logo_url = COALESCE(?, logo_url),
           login_bg_url = COALESCE(?, login_bg_url)
       ORDER BY id ASC LIMIT 1`,
      [
        restaurant_name !== undefined ? String(restaurant_name).trim().slice(0, 150) : null,
        phone !== undefined ? String(phone).trim().slice(0, 40) : null,
        address !== undefined ? String(address).trim().slice(0, 255) : null,
        tax_id !== undefined ? String(tax_id).trim().slice(0, 50) : null,
        currency_symbol !== undefined ? String(currency_symbol).trim().slice(0, 10) : null,
        receipt_footer !== undefined ? String(receipt_footer).trim() : null,
        tip_percent !== undefined ? Number(tip_percent) : null,
        logo_url !== undefined ? String(logo_url).trim() : null,
        login_bg_url !== undefined ? String(login_bg_url).trim() : null,
      ]
    );
  },

  async getAppSetting(key) {
    const [rows] = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1`,
      [key]
    );
    return rows?.[0]?.setting_value || null;
  },

  async setAppSetting(key, value) {
    await query(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, String(value)]
    );
  },

  async getTipPercent() {
    const profile = await this.getBusinessProfile();
    if (profile?.tip_percent !== undefined && profile?.tip_percent !== null) {
      const pct = Number(profile.tip_percent);
      if (!Number.isNaN(pct)) return Math.max(0, Math.min(100, pct));
    }
    const val = await this.getAppSetting("tip_percent");
    const pct = Number(val || 0);
    if (Number.isNaN(pct)) return 0;
    return Math.max(0, Math.min(100, pct));
  },

  async getRestaurantName() {
    const profile = await this.getBusinessProfile();
    if (profile?.restaurant_name) return profile.restaurant_name;
    const raw = await this.getAppSetting("restaurant_name");
    return String(raw || "").trim() || "Mi Restaurante";
  },

  async getLogoUrl() {
    const profile = await this.getBusinessProfile();
    if (profile?.logo_url) return profile.logo_url;
    const raw = await this.getAppSetting("logo_url");
    return String(raw || "").trim();
  },

  async getLoginBgUrl() {
    const profile = await this.getBusinessProfile();
    if (profile?.login_bg_url) return profile.login_bg_url;
    const raw = await this.getAppSetting("login_bg_url");
    return String(raw || "").trim();
  },

  async getTipExcludedMethods() {
    const [rows] = await query(`SELECT code FROM payment_methods WHERE applies_tip = 0`);
    return rows.map((r) => r.code);
  },

  async setTipExcludedMethods(list) {
    await query(`UPDATE payment_methods SET applies_tip = 1`);
    if (list.length) {
      const placeholders = list.map(() => "?").join(",");
      await query(`UPDATE payment_methods SET applies_tip = 0 WHERE code IN (${placeholders})`, list);
    }
    await this.setAppSetting("tip_excluded_methods", list.join(","));
  },

  // Modules & Permissions
  async getActiveModules() {
    const [rows] = await query(`SELECT code, label, is_active, sort_order FROM app_modules WHERE is_active = 1 ORDER BY sort_order, code`);
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
    const [roles] = await query(`SELECT id, name, slug, description, is_system FROM roles ORDER BY id`);
    const [permissions] = await query(`SELECT id, name, slug, module_code, description FROM permissions ORDER BY module_code, id`);
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

  async createRole({ name, slug, description }) {
    const [r] = await query(
      `INSERT INTO roles (name, slug, description) VALUES (?, ?, ?)`,
      [name, slug, description]
    );
    return r.insertId;
  },

  async getRoleById(roleId) {
    const [rows] = await query(`SELECT id, name, slug, description, is_system FROM roles WHERE id = ? LIMIT 1`, [roleId]);
    return rows[0] || null;
  },

  async updateRole(roleId, { name, description }) {
    await query(
      `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
      [name, description, roleId]
    );
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

  // Operation Centers
  async createOperationCenter(name) {
    const [inserted] = await query(
      `INSERT INTO operation_centers (name, is_active) VALUES (?, 1)`,
      [name]
    );
    return inserted.insertId;
  },

  async updateOperationCenter(centerId, { name, isActive }) {
    await query(
      `UPDATE operation_centers
       SET name = ?, is_active = ?
       WHERE id = ?`,
      [name, Number(isActive) ? 1 : 0, centerId]
    );
  },

  async hasAccountsInCenter(centerId) {
    const [accounts] = await query(`SELECT id FROM accounts WHERE operation_center_id = ? LIMIT 1`, [centerId]);
    return accounts.length > 0;
  },

  async hasTablesInCenter(centerId) {
    const [tables] = await query(`SELECT id FROM restaurant_tables WHERE operation_center_id = ? LIMIT 1`, [centerId]);
    return tables.length > 0;
  },

  async deleteOperationCenter(centerId) {
    await query(`DELETE FROM operation_center_products WHERE center_id = ?`, [centerId]);
    await query(`DELETE FROM operation_centers WHERE id = ?`, [centerId]);
  },

  async setOperationCenterProducts(centerId, productId, isEnabled) {
    await query(
      `INSERT INTO operation_center_products (center_id, product_id, is_enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
      [centerId, Number(productId), Number(isEnabled) ? 1 : 0]
    );
  },

  async setTerminalCenterBinding(ip, centerId, label) {
    await query(
      `INSERT INTO terminal_center_bindings (ip_address, center_id, label, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE center_id = VALUES(center_id), label = VALUES(label), is_active = 1`,
      [ip, Number(centerId), String(label || "").trim()]
    );
  },

  async getPaymentMethods(includeInactive = true) {
    const sql = includeInactive
      ? `SELECT code, label, is_active, sort_order, applies_tip FROM payment_methods ORDER BY sort_order ASC, label ASC`
      : `SELECT code, label, is_active, sort_order, applies_tip FROM payment_methods WHERE is_active = 1 ORDER BY sort_order ASC, label ASC`;
    const [rows] = await query(sql);
    return rows || [];
  },

  async savePaymentMethod({ code, label, isActive = 1, sortOrder = 0, appliesTip = 1 }) {
    await query(
      `INSERT INTO payment_methods (code, label, is_active, sort_order, applies_tip)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         is_active = VALUES(is_active),
         sort_order = VALUES(sort_order),
         applies_tip = VALUES(applies_tip)`,
      [code, label, Number(isActive) ? 1 : 0, Number(sortOrder) || 0, Number(appliesTip) ? 1 : 0]
    );
  },

  async hasPaymentsWithMethod(code) {
    const [rows] = await query(
      `SELECT id FROM account_payments WHERE method = ? LIMIT 1`,
      [code]
    );
    return rows.length > 0;
  },

  async deletePaymentMethod(code) {
    await query(`DELETE FROM payment_methods WHERE code = ?`, [code]);
  },

  // Discount Presets
  async createDiscountPreset({ name, type, value = 0, isActive = 1, sortOrder = 0 }) {
    await query(
      `INSERT INTO discount_presets (name, type, value, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [name, type, Number(value) || 0, Number(isActive) ? 1 : 0, Number(sortOrder) || 0]
    );
  },

  async updateDiscountPreset(presetId, { name, type, value = 0, isActive = 1, sortOrder = 0 }) {
    await query(
      `UPDATE discount_presets
       SET name = ?, type = ?, value = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [name, type, Number(value) || 0, Number(isActive) ? 1 : 0, Number(sortOrder) || 0, presetId]
    );
  },

  // Production Centers
  async getProductionCenters() {
    const [centers] = await query(
      `SELECT id, name, printer_name, printer_ip, printer_port, is_active, operation_center_id
       FROM production_centers
       ORDER BY id`
    );
    return centers;
  },

  async getProductionCenterById(id) {
    const [rows] = await query(
      `SELECT id, name AS printer_name, printer_name AS name, printer_ip, printer_port
       FROM production_centers WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async createProductionCenter({ name, printerName = "", printerIp = "", printerPort = 9100, isActive = 1, operationCenterId = null }) {
    const [result] = await query(
      `INSERT INTO production_centers (name, printer_name, printer_ip, printer_port, is_active, operation_center_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        printerName,
        printerIp || null,
        Number(printerPort) || 9100,
        Number(isActive) ? 1 : 0,
        operationCenterId ? Number(operationCenterId) : null,
      ]
    );
    return result.insertId;
  },

  async updateProductionCenter(centerId, { name, printerName = "", printerIp = "", printerPort = 9100, isActive = 1, operationCenterId = null }) {
    await query(
      `UPDATE production_centers
       SET name = ?, printer_name = ?, printer_ip = ?, printer_port = ?, is_active = ?, operation_center_id = ?
       WHERE id = ?`,
      [
        name,
        printerName,
        printerIp || null,
        Number(printerPort) || 9100,
        Number(isActive) ? 1 : 0,
        operationCenterId ? Number(operationCenterId) : null,
        centerId,
      ]
    );
  },

  async countProductsInProductionCenter(centerId) {
    const [usage] = await query(
      `SELECT COUNT(*) as cnt FROM product_production_centers WHERE center_id = ?`,
      [centerId]
    );
    return Number(usage[0]?.cnt || 0);
  },

  async deleteProductionCenter(centerId) {
    await query(`DELETE FROM production_centers WHERE id = ?`, [centerId]);
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

  // Terminals
  async getTerminalById(id) {
    const [rows] = await query(
      `SELECT id, name AS printer_name, printer_name AS name, printer_ip, printer_port
       FROM terminals WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async createTerminal({ operationCenterId, name, printerName = null, printerIp = null, printerPort = 9100 }) {
    const [result] = await query(
      `INSERT INTO terminals (operation_center_id, name, printer_name, printer_ip, printer_port) VALUES (?, ?, ?, ?, ?)`,
      [Number(operationCenterId), name, printerName || null, printerIp || null, Number(printerPort) || 9100]
    );
    return result.insertId;
  },

  async updateTerminal(terminalId, { operationCenterId, name, printerName = null, printerIp = null, printerPort = 9100, isActive = 1 }) {
    await query(
      `UPDATE terminals SET operation_center_id = ?, name = ?, printer_name = ?, printer_ip = ?, printer_port = ?, is_active = ? WHERE id = ?`,
      [Number(operationCenterId), name, printerName || null, printerIp || null, Number(printerPort) || 9100, Number(isActive) ? 1 : 0, terminalId]
    );
  },

  async deleteTerminal(terminalId) {
    await query(`DELETE FROM terminals WHERE id = ?`, [terminalId]);
  },

  async getRecentPrintJobs(limit = 50) {
    const [jobs] = await query(
      `SELECT id, printer_target, printer_ip, printer_port, job_type, account_id,
              status, attempts, error_message, created_at, completed_at
       FROM print_jobs
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );
    return jobs;
  },

  async resolveTerminalForUser(userId) {
    if (!userId) return null;
    const [userRows] = await query(
      `SELECT operation_center_id FROM staff_users WHERE id = ? LIMIT 1`,
      [Number(userId)]
    );
    const centerId = userRows?.[0]?.operation_center_id;
    if (!centerId) {
      const [termRows] = await query(
        `SELECT id, name, printer_name, printer_ip, printer_port
         FROM terminals
         WHERE is_active = 1
         ORDER BY id LIMIT 1`
      );
      return termRows?.[0] || null;
    }
    const [termRows] = await query(
      `SELECT id, name, printer_name, printer_ip, printer_port
       FROM terminals
       WHERE operation_center_id = ? AND is_active = 1
       ORDER BY id LIMIT 1`,
      [centerId]
    );
    return termRows?.[0] || null;
  },

  // Bootstrap & Full Settings aggregators
  async getBootstrapData(ip) {
    const [centers] = await query(
      `SELECT id, name
       FROM operation_centers
       WHERE is_active = 1
       ORDER BY id`
    );
    const defaultCenterId = centers.length ? Number(centers[0].id) : null;
    const [bindingRows] = await query(
      `SELECT center_id
       FROM terminal_center_bindings
       WHERE ip_address = ? AND is_active = 1
       LIMIT 1`,
      [ip]
    );
    const autoCenterId = bindingRows.length ? Number(bindingRows[0].center_id) : null;
    const [tables] = await query(
      `SELECT t.id, t.code, t.seats, a.name AS area_name, t.operation_center_id
       FROM restaurant_tables t
       INNER JOIN dining_areas a ON a.id = t.area_id
       WHERE t.is_active = 1
       ORDER BY a.name, t.code`
    );
    const [userModules] = await query(
      `SELECT user_id, module_code, is_enabled
       FROM user_module_permissions`
    );
    const [deviceModules] = await query(
      `SELECT ip_address, module_code, is_enabled
       FROM terminal_module_bindings
       WHERE ip_address = ?`,
      [ip]
    );
    const [permissions] = await query(
      `SELECT id, name, slug, module_code, description
       FROM permissions
       ORDER BY module_code, id`
    );
    const [roles] = await query(
      `SELECT id, name, slug, description, is_system
       FROM roles
       ORDER BY id`
    );
    const [rolePerms] = await query(`SELECT role_id, permission_id FROM role_permissions`);
    const permByRole = {};
    for (const rp of rolePerms) {
      const rid = Number(rp.role_id);
      if (!permByRole[rid]) permByRole[rid] = [];
      permByRole[rid].push(Number(rp.permission_id));
    }
    const [userRoles] = await query(`SELECT user_id, role_id FROM user_roles`);
    const rolesByUser = {};
    for (const ur of userRoles) {
      const uid = Number(ur.user_id);
      if (!rolesByUser[uid]) rolesByUser[uid] = [];
      rolesByUser[uid].push(Number(ur.role_id));
    }
    const [profileRows] = await query(`SELECT * FROM business_profile ORDER BY id ASC LIMIT 1`);
    const businessProfile = profileRows[0] || null;
    const restaurantName = businessProfile?.restaurant_name || (await this.getRestaurantName());
    const logoUrl = businessProfile?.logo_url || (await this.getLogoUrl());
    const loginBgUrl = businessProfile?.login_bg_url || (await this.getLoginBgUrl());

    return {
      centers,
      defaultCenterId,
      autoCenterId,
      tables,
      userModules,
      deviceModules,
      permissions,
      roles,
      permByRole,
      rolesByUser,
      restaurantName,
      logoUrl,
      loginBgUrl,
      businessProfile,
    };
  },

  async getFullSettingsData(currentIp) {
    const [operationCenters] = await query(`SELECT id, name, is_active FROM operation_centers ORDER BY id`);
    const [areas] = await query(`SELECT id, name, is_active, sort_order FROM dining_areas ORDER BY sort_order, name`);
    const [categories] = await query(`SELECT id, name, is_active, sort_order, color, operation_center_id FROM product_categories ORDER BY sort_order, name`);
    const [tables] = await query(
      `SELECT t.id, t.code, t.seats, t.is_active, t.area_id, t.operation_center_id, a.name AS area_name
       FROM restaurant_tables t
       INNER JOIN dining_areas a ON a.id = t.area_id
       ORDER BY a.name, t.code`
    );
    const [paymentMethods] = await query(`SELECT code, label, is_active, sort_order FROM payment_methods ORDER BY sort_order, label`);
    const [products] = await query(
      `SELECT p.id, p.name, p.category_id, p.base_price, p.allow_discount, p.is_active, c.name AS category_name
       FROM products p
       INNER JOIN product_categories c ON c.id = p.category_id
       ORDER BY p.name`
    );
    const [centerProducts] = await query(`SELECT center_id, product_id, is_enabled FROM operation_center_products`);
    const [terminalBindings] = await query(`SELECT ip_address, center_id, label, is_active FROM terminal_center_bindings ORDER BY ip_address`);
    const [groups] = await query(`SELECT id, name, group_type, min_select, max_select, is_mandatory, display_method, sort_order, is_active FROM modifier_groups ORDER BY sort_order, name`);
    const [options] = await query(`SELECT id, group_id, name, price_delta, sort_order, is_active FROM modifier_options ORDER BY group_id, sort_order, name`);
    const [productSteps] = await query(`SELECT product_id, group_id, sort_order FROM product_modifier_groups ORDER BY product_id, sort_order`);
    const [discountPresets] = await query(`SELECT id, name, type, value, is_active, sort_order FROM discount_presets ORDER BY sort_order, name`);
    const [modules] = await query(`SELECT code, label, is_active, sort_order FROM app_modules ORDER BY sort_order, code`);
    const [staffUsers] = await query(
      `SELECT su.id, su.full_name, su.role, su.pin_code, su.operation_center_id,
              GROUP_CONCAT(DISTINCT r.name SEPARATOR ', ') AS role_names
       FROM staff_users su
       LEFT JOIN user_roles ur ON ur.user_id = su.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY su.id
       ORDER BY su.full_name`
    );
    const [userModulePermissions] = await query(`SELECT user_id, module_code, is_enabled FROM user_module_permissions`);
    const [deviceModulePermissions] = await query(
      `SELECT ip_address, module_code, is_enabled
       FROM terminal_module_bindings
       WHERE ip_address = ?`,
      [currentIp]
    );
    const [terminals] = await query(
      `SELECT t.id, t.operation_center_id, t.name, t.printer_name, t.printer_ip, t.printer_port, t.is_active, c.name AS center_name
       FROM terminals t
       INNER JOIN operation_centers c ON c.id = t.operation_center_id
       WHERE t.is_active = 1
       ORDER BY c.name, t.name`
    );
    const [roles] = await query(`SELECT id, name, slug, description, is_system FROM roles ORDER BY id`);
    const [permissions] = await query(`SELECT id, name, slug, module_code, description FROM permissions ORDER BY module_code, id`);
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
    const tipPercent = await this.getTipPercent();
    const restaurantName = await this.getRestaurantName();
    const logoUrl = await this.getLogoUrl();
    const loginBgUrl = await this.getLoginBgUrl();

    return {
      operationCenters,
      areas,
      categories,
      tables,
      paymentMethods,
      products,
      centerProducts,
      terminalBindings,
      groups,
      options,
      productSteps,
      discountPresets,
      modules,
      staffUsers,
      userModulePermissions,
      deviceModulePermissions,
      terminals,
      roles,
      permissions,
      permByRole,
      rolesByUser,
      currentIp,
      tipPercent,
      restaurantName,
      logoUrl,
      loginBgUrl,
    };
  },

  async getConfigData() {
    const [products] = await query(
      `SELECT p.id, p.name, p.category_id, p.base_price, p.allow_discount, p.is_active, p.track_inventory, c.name AS category_name
       FROM products p
       INNER JOIN product_categories c ON c.id = p.category_id
       WHERE p.is_active = 1
       ORDER BY p.name`
    );
    const [productProductionCenters] = await query(
      `SELECT product_id, center_id FROM product_production_centers`
    );
    const [categories] = await query(
      `SELECT id, name, color, is_active, sort_order
       FROM product_categories
       ORDER BY sort_order, name`
    );
    const [areas] = await query(
      `SELECT id, name, is_active, sort_order
       FROM dining_areas
       ORDER BY sort_order, name`
    );
    const [centers] = await query(
      `SELECT id, name, is_active
       FROM operation_centers
       ORDER BY id`
    );
    const [productionCenters] = await query(
      `SELECT id, name, printer_name, is_active, operation_center_id
       FROM production_centers
       ORDER BY id`
    );
    const [tables] = await query(
      `SELECT t.id, t.code, t.seats, t.area_id, t.operation_center_id, t.is_active, a.name AS area_name
       FROM restaurant_tables t
       INNER JOIN dining_areas a ON a.id = t.area_id
       ORDER BY a.name, t.code`
    );
    const [groups] = await query(
      `SELECT id, name, group_type, min_select, max_select, is_mandatory, display_method, sort_order, is_active
       FROM modifier_groups
       ORDER BY sort_order, name`
    );
    const [options] = await query(
      `SELECT id, group_id, name, price_delta, sort_order, is_active
       FROM modifier_options
       ORDER BY sort_order, name`
    );
    const [productModifierGroups] = await query(
      `SELECT product_id, group_id, sort_order FROM product_modifier_groups`
    );
    const [staffUsers] = await query(
      `SELECT su.id, su.full_name, su.role, su.pin_code, su.operation_center_id,
              GROUP_CONCAT(DISTINCT r.name SEPARATOR ', ') AS role_names
       FROM staff_users su
       LEFT JOIN user_roles ur ON ur.user_id = su.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY su.id
       ORDER BY su.full_name`
    );
    const [roles] = await query(`SELECT id, name, slug, description, is_system FROM roles ORDER BY id`);
    const [permissions] = await query(`SELECT id, name, slug, module_code, description FROM permissions ORDER BY module_code, id`);
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

    return {
      products,
      categories,
      areas,
      centers,
      tables,
      productionCenters,
      productProductionCenters,
      groups,
      options,
      productModifierGroups,
      staffUsers,
      roles,
      permissions,
      permByRole,
      rolesByUser,
    };
  },
};

module.exports = settingsRepository;
