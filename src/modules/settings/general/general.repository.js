// src/modules/settings/general/general.repository.js
// Repositorio de consultas SQL puras para Perfil del Negocio, Branding, Propinas y Bootstrap

const { query } = require("../../../common/db");

const generalRepository = {
  // ───────── Business Profile & App Settings ─────────
  async getBusinessProfile() {
    try {
      const [rows] = await query(`SELECT * FROM business_profile ORDER BY id ASC LIMIT 1`);
      if (rows && rows[0]) return rows[0];
    } catch (_) {}
    return null;
  },

  async updateBusinessProfile(data) {
    if (!data || typeof data !== "object") return;
    const allowed = {
      restaurant_name: (v) => (v ? String(v).trim().slice(0, 150) : null),
      business_subtitle: (v) => (v !== undefined && v !== null ? String(v).trim().slice(0, 150) : null),
      phone: (v) => (v !== undefined && v !== null ? String(v).trim().slice(0, 40) : null),
      address: (v) => (v !== undefined && v !== null ? String(v).trim().slice(0, 255) : null),
      tax_id: (v) => (v !== undefined && v !== null ? String(v).trim().slice(0, 50) : null),
      currency_symbol: (v) => (v ? String(v).trim().slice(0, 10) : "Q"),
      receipt_footer: (v) => (v !== undefined && v !== null ? String(v).trim() : null),
      shift_receipt_footer: (v) => (v !== undefined && v !== null ? String(v).trim() : null),
      tip_percent: (v) => (v !== undefined && v !== null ? Number(v) : null),
      logo_url: (v) => (v ? String(v).trim() : null),
      login_bg_url: (v) => (v ? String(v).trim() : null),
      receipt_logo_url: (v) => (v ? String(v).trim() : null),
    };

    const setClauses = [];
    const values = [];

    for (const [key, sanitize] of Object.entries(allowed)) {
      if (data[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(sanitize(data[key]));
      }
    }

    if (setClauses.length === 0) return;
    await query(
      `UPDATE business_profile SET ${setClauses.join(", ")} ORDER BY id ASC LIMIT 1`,
      values
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

  // ───────── Agregadores: Bootstrap & Full Settings ─────────
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

    const [paymentMethods] = await query(
      `SELECT code, label, is_active, sort_order, applies_tip
       FROM payment_methods
       WHERE is_active = 1
       ORDER BY sort_order ASC, label ASC`
    );

    const [kitchenNotes] = await query(
      `SELECT id, label, category, sort_order
       FROM kitchen_quick_notes
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );

    return {
      centers,
      defaultCenterId,
      autoCenterId,
      tables,
      paymentMethods,
      kitchenNotes,
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
      `SELECT p.id, p.name, p.category_id, p.base_price, p.allow_discount, p.is_active,
              p.image_url, p.description, p.estimated_prep_min,
              c.name AS category_name
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
      `SELECT su.id, su.full_name, su.role,
              CASE WHEN su.pin_code IS NOT NULL AND su.pin_code != '' THEN '••••••' ELSE '' END AS pin_code,
              su.operation_center_id,
              GROUP_CONCAT(DISTINCT r.name SEPARATOR ', ') AS role_names
       FROM staff_users su
       LEFT JOIN user_roles ur ON ur.user_id = su.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY su.id
       ORDER BY su.full_name`
    );
    const [userModulePermissions] = await query(`SELECT user_id, module_code, is_enabled FROM user_module_permissions`);
    const [terminalModuleBindings] = await query(`SELECT ip_address, module_code, is_enabled FROM terminal_module_bindings`);
    const [roles] = await query(`SELECT id, name, slug, description, is_system, default_view FROM roles ORDER BY id`);
    const [permissions] = await query(`SELECT id, name, slug, module_code, description FROM permissions ORDER BY module_code, id`);
    const [rolePermissions] = await query(`SELECT role_id, permission_id FROM role_permissions`);
    const [userRoles] = await query(`SELECT user_id, role_id FROM user_roles`);
    const [profileRows] = await query(`SELECT * FROM business_profile ORDER BY id ASC LIMIT 1`);
    const businessProfile = profileRows[0] || null;

    const [productionCenters] = await query(
      `SELECT pc.id, pc.name, pc.printer_name, pc.printer_ip, pc.printer_port, pc.printer_id, pc.is_active,
              pc.operation_center_id, p.name AS printer_model_name, oc.name AS operation_center_name
       FROM production_centers pc
       LEFT JOIN printers p ON p.id = pc.printer_id
       LEFT JOIN operation_centers oc ON oc.id = pc.operation_center_id
       ORDER BY pc.id`
    );
    const [printers] = await query(
      `SELECT id, name, ip, port, type, paper_width, is_active, description,
              created_at, updated_at
       FROM printers
       ORDER BY name`
    );
    const [routingMatrix] = await query(
      `SELECT me.id, me.area_trabajo_id, me.categoria_impresion_id, me.centro_produccion_id,
              da.name AS area_nombre, ci.nombre AS categoria_nombre, pc.name AS centro_nombre
       FROM matriz_enrutamiento me
       INNER JOIN dining_areas da ON da.id = me.area_trabajo_id
       INNER JOIN categorias_impresion ci ON ci.id = me.categoria_impresion_id
       INNER JOIN production_centers pc ON pc.id = me.centro_produccion_id
       ORDER BY da.sort_order, da.name, ci.nombre`
    );
    const [printCategories] = await query(
      `SELECT id, nombre, descripcion FROM categorias_impresion ORDER BY nombre`
    );
    const [terminals] = await query(
      `SELECT t.id, t.operation_center_id, t.name, t.printer_name, t.printer_ip, t.printer_port, t.printer_id, t.is_active,
              t.area_trabajo_id, t.is_kds, t.kds_production_center_id, t.kds_operation_center_id, t.device_serial,
              da.name AS area_name, c.name AS center_name, p.name AS printer_model_name,
              pc_kds.name AS kds_production_center_name,
              oc_kds.name AS kds_operation_center_name
       FROM terminals t
       INNER JOIN operation_centers c ON c.id = t.operation_center_id
       LEFT JOIN dining_areas da ON da.id = t.area_trabajo_id
       LEFT JOIN printers p ON p.id = t.printer_id
       LEFT JOIN production_centers pc_kds ON pc_kds.id = t.kds_production_center_id
       LEFT JOIN operation_centers oc_kds ON oc_kds.id = t.kds_operation_center_id
       ORDER BY c.name, t.name`
    );
    const [licensedTerminals] = await query(
      `SELECT id, serial, label, ip_address, terminal_type, status, last_seen_at
       FROM licensed_terminals
       WHERE status = 'active'
       ORDER BY label ASC, first_seen_at DESC`
    );
    const [kitchenNotes] = await query(
      `SELECT id, label, category, sort_order, is_active
       FROM kitchen_quick_notes
       ORDER BY sort_order ASC, id ASC`
    );

    const restaurantName = businessProfile?.restaurant_name || (await this.getRestaurantName());
    const tipPercent = await this.getTipPercent();
    const logoUrl = businessProfile?.logo_url || (await this.getLogoUrl());
    const loginBgUrl = businessProfile?.login_bg_url || (await this.getLoginBgUrl());

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
      terminalModuleBindings,
      roles,
      permissions,
      rolePermissions,
      userRoles,
      businessProfile,
      productionCenters,
      printers,
      terminals,
      licensedTerminals,
      routingMatrix,
      printCategories,
      kitchenNotes,
      restaurantName,
      tipPercent,
      logoUrl,
      loginBgUrl,
    };
  },

  async getConfigData() {
    const [products] = await query(
      `SELECT p.id, p.name, p.category_id, p.base_price, p.allow_discount, p.is_active, p.track_inventory,
              p.categoria_impresion_id, p.centro_produccion_exclusivo_id,
              p.image_url, p.description, p.estimated_prep_min,
              c.name AS category_name, ci.nombre AS categoria_impresion_nombre, cp_excl.name AS centro_exclusivo_nombre
       FROM products p
       INNER JOIN product_categories c ON c.id = p.category_id
       LEFT JOIN categorias_impresion ci ON ci.id = p.categoria_impresion_id
       LEFT JOIN production_centers cp_excl ON cp_excl.id = p.centro_produccion_exclusivo_id
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
      `SELECT id, name, printer_name, printer_ip, printer_port, printer_id, is_active, operation_center_id
       FROM production_centers
       ORDER BY id`
    );
    const [printers] = await query(
      `SELECT id, name, ip, port, type, paper_width, is_active, description
       FROM printers
       ORDER BY name`
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
      `SELECT su.id, su.full_name, su.role,
              CASE WHEN su.pin_code IS NOT NULL AND su.pin_code != '' THEN '••••••' ELSE '' END AS pin_code,
              su.operation_center_id,
              GROUP_CONCAT(DISTINCT r.name SEPARATOR ', ') AS role_names
       FROM staff_users su
       LEFT JOIN user_roles ur ON ur.user_id = su.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY su.id
       ORDER BY su.full_name`
    );
    const [roles] = await query(`SELECT id, name, slug, description, is_system, default_view FROM roles ORDER BY id`);
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

    const [paymentMethods] = await query(
      `SELECT code, label, is_active, sort_order, applies_tip
       FROM payment_methods
       ORDER BY sort_order ASC, label ASC`
    );

    const [terminals] = await query(
      `SELECT t.id, t.operation_center_id, t.name, t.printer_name, t.printer_ip, t.printer_port, t.printer_id, t.is_active,
              t.area_trabajo_id, t.is_kds, t.kds_production_center_id, t.kds_operation_center_id, t.device_serial,
              da.name AS area_name, c.name AS center_name,
              pc_kds.name AS kds_production_center_name,
              oc_kds.name AS kds_operation_center_name
       FROM terminals t
       INNER JOIN operation_centers c ON c.id = t.operation_center_id
       LEFT JOIN dining_areas da ON da.id = t.area_trabajo_id
       LEFT JOIN production_centers pc_kds ON pc_kds.id = t.kds_production_center_id
       LEFT JOIN operation_centers oc_kds ON oc_kds.id = t.kds_operation_center_id
       ORDER BY c.name, t.name`
    );

    const [licensedTerminals] = await query(
      `SELECT id, serial, label, ip_address, terminal_type, status, last_seen_at
       FROM licensed_terminals
       WHERE status = 'active'
       ORDER BY label ASC, first_seen_at DESC`
    );

    const [routingMatrix] = await query(
      `SELECT me.id, me.area_trabajo_id, me.categoria_impresion_id, me.centro_produccion_id,
              da.name AS area_nombre, ci.nombre AS categoria_nombre, pc.name AS centro_nombre
       FROM matriz_enrutamiento me
       INNER JOIN dining_areas da ON da.id = me.area_trabajo_id
       INNER JOIN categorias_impresion ci ON ci.id = me.categoria_impresion_id
       INNER JOIN production_centers pc ON pc.id = me.centro_produccion_id
       ORDER BY da.sort_order, da.name, ci.nombre`
    );

    const [printCategories] = await query(
      `SELECT id, nombre, descripcion FROM categorias_impresion ORDER BY nombre`
    );

    const [kitchenNotes] = await query(
      `SELECT id, label, category, sort_order, is_active
       FROM kitchen_quick_notes
       ORDER BY sort_order ASC, id ASC`
    );

    return {
      products,
      categories,
      areas,
      centers,
      tables,
      terminals,
      licensedTerminals,
      productionCenters,
      printers,
      productProductionCenters,
      groups,
      options,
      productModifierGroups,
      paymentMethods,
      kitchenNotes,
      routingMatrix,
      printCategories,
      staffUsers,
      roles,
      permissions,
      permByRole,
      rolesByUser,
    };
  },
};

module.exports = generalRepository;
