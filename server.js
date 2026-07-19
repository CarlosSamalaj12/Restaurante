require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const ExcelJS = require("exceljs");
const { pool, query } = require("./src/db");

const app = express();
const IS_PROD = process.env.NODE_ENV === "production";

class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", detail = null) {
    super(message || "Error interno");
    this.name = "AppError";
    this.status = Number(status) || 500;
    this.code = String(code || "INTERNAL_ERROR");
    this.detail = detail;
  }
}

app.use((req, res, next) => {
  req.traceId = crypto.randomUUID();
  res.setHeader("x-trace-id", req.traceId);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, "public")));

const PAYMENT_METHOD_DEFAULTS = [
  { code: "cash", label: "Efectivo" },
  { code: "card", label: "Tarjeta" },
  { code: "transfer", label: "Transferencia" },
  { code: "cxc", label: "Cuentas por Cobrar" },
  { code: "other", label: "Otro" },
];

const MODULE_DEFAULTS = [
  { code: "restaurant", label: "Modulo Restaurante", sortOrder: 1 },
  { code: "pms", label: "Modulo PMS", sortOrder: 2 },
  { code: "crm", label: "Modulo CRM", sortOrder: 3 },
  { code: "erp", label: "Modulo ERP", sortOrder: 4 },
];

const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const authSessions = new Map();

function normalizeGroupType(value) {
  const valid = new Set(["garnish", "preparation", "sauce", "meat_term", "milk_type", "beverage_temp", "ice", "other"]);
  const groupType = String(value || "other").trim();
  return valid.has(groupType) ? groupType : "other";
}

function normalizePaymentMethodCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function money(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function clientIp(req) {
  const raw = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
  return raw.replace("::ffff:", "");
}

function createAuthSession(user) {
  const token = crypto.randomUUID();
  authSessions.set(token, {
    userId: Number(user.id),
    role: String(user.role || ""),
    expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
  });
  return token;
}

function getAuthSession(req) {
  const token = String(req.headers["x-auth-token"] || "").trim();
  if (!token) return null;
  const session = authSessions.get(token);
  if (!session) return null;
  if (Date.now() > Number(session.expiresAt || 0)) {
    authSessions.delete(token);
    return null;
  }
  return session;
}

async function requireAdmin(req, res, next) {
  try {
    const session = getAuthSession(req);
    if (!session) return res.status(401).json({ error: "Sesion invalida o vencida" });
    const [rows] = await query(
      `SELECT id, full_name, role
       FROM staff_users
       WHERE id = ?
       LIMIT 1`,
      [Number(session.userId)]
    );
    if (!rows.length) return res.status(401).json({ error: "Usuario no encontrado" });
    if (String(rows[0].role || "") !== "admin") {
      return res.status(403).json({ error: "Solo admin puede usar esta seccion" });
    }
    req.authUser = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

async function getActiveModules() {
  const [rows] = await query(
    `SELECT code, label, is_active, sort_order
     FROM app_modules
     WHERE is_active = 1
     ORDER BY sort_order, code`
  );
  return rows;
}

async function getUserEnabledModuleCodes(userId, role, activeCodes) {
  const [rows] = await query(
    `SELECT module_code, is_enabled
     FROM user_module_permissions
     WHERE user_id = ?`,
    [Number(userId)]
  );
  if (rows.length) {
    const enabled = new Set(
      rows.filter((r) => Number(r.is_enabled) === 1).map((r) => String(r.module_code || "").trim())
    );
    return activeCodes.filter((code) => enabled.has(code));
  }
  if (String(role || "") === "admin") return [...activeCodes];
  return activeCodes.includes("restaurant") ? ["restaurant"] : [];
}

async function getDeviceEnabledModuleCodes(ip, activeCodes) {
  const [rows] = await query(
    `SELECT module_code, is_enabled
     FROM terminal_module_bindings
     WHERE ip_address = ?`,
    [String(ip || "").trim()]
  );
  if (rows.length) {
    const enabled = new Set(
      rows.filter((r) => Number(r.is_enabled) === 1).map((r) => String(r.module_code || "").trim())
    );
    return activeCodes.filter((code) => enabled.has(code));
  }
  return activeCodes.includes("restaurant") ? ["restaurant"] : [];
}

async function getAllowedModulesForContext(user, ip) {
  const activeModules = await getActiveModules();
  const activeCodes = activeModules.map((m) => String(m.code));
  const userAllowed = await getUserEnabledModuleCodes(user.id, user.role, activeCodes);
  const deviceAllowed = await getDeviceEnabledModuleCodes(ip, activeCodes);
  const finalSet = new Set(deviceAllowed);
  return activeModules.filter((m) => userAllowed.includes(String(m.code)) && finalSet.has(String(m.code)));
}

async function safeExec(sql, params = []) {
  try {
    await query(sql, params);
  } catch (e) {
    const msg = String(e.message || "");
    if (
      msg.includes("Duplicate column name") ||
      msg.includes("Duplicate key name") ||
      msg.includes("already exists")
    ) {
      return;
    }
    throw e;
  }
}

async function ensureConfigTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS payment_methods (
      code VARCHAR(30) PRIMARY KEY,
      label VARCHAR(80) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    )`
  );

  for (let i = 0; i < PAYMENT_METHOD_DEFAULTS.length; i += 1) {
    const item = PAYMENT_METHOD_DEFAULTS[i];
    await query(
      `INSERT INTO payment_methods (code, label, is_active, sort_order)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label)`,
      [item.code, item.label, i + 1]
    );
  }

  await query(
    `CREATE TABLE IF NOT EXISTS discount_presets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      type ENUM('percent', 'fixed') NOT NULL,
      value DECIMAL(10,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS operation_centers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS operation_center_products (
      center_id INT NOT NULL,
      product_id INT NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (center_id, product_id)
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS terminal_center_bindings (
      ip_address VARCHAR(64) PRIMARY KEY,
      center_id INT NOT NULL,
      label VARCHAR(120) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(60) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS app_modules (
      code VARCHAR(30) PRIMARY KEY,
      label VARCHAR(80) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS user_module_permissions (
      user_id INT NOT NULL,
      module_code VARCHAR(30) NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, module_code)
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS terminal_module_bindings (
      ip_address VARCHAR(64) NOT NULL,
      module_code VARCHAR(30) NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (ip_address, module_code)
    )`
  );
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('tip_percent', '0')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('restaurant_name', 'Mi Restaurante')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('logo_url', '')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('login_bg_url', '')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );

  await safeExec(`ALTER TABLE app_settings MODIFY COLUMN setting_value TEXT NOT NULL`);

  for (const mod of MODULE_DEFAULTS) {
    await query(
      `INSERT INTO app_modules (code, label, is_active, sort_order)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order)`,
      [mod.code, mod.label, Number(mod.sortOrder || 0)]
    );
  }

  await safeExec(`ALTER TABLE restaurant_tables ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE shifts ADD COLUMN operation_center_id INT NULL`);
  await safeExec(
    `ALTER TABLE modifier_groups
     ADD COLUMN group_type ENUM('garnish', 'preparation', 'sauce', 'meat_term', 'milk_type', 'beverage_temp', 'ice', 'other')
     NOT NULL DEFAULT 'other'`
  );
  await safeExec(`ALTER TABLE modifier_groups ADD COLUMN is_mandatory TINYINT(1) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE modifier_groups ADD COLUMN display_method ENUM('buttons', 'radio', 'checkbox') NOT NULL DEFAULT 'buttons'`);
  await safeExec(`ALTER TABLE modifier_groups ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE modifier_options ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE product_categories ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE product_categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE product_categories ADD COLUMN color VARCHAR(7) DEFAULT '#6366f1'`);
  await safeExec(`ALTER TABLE dining_areas ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE dining_areas ADD COLUMN sort_order INT NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE order_items ADD COLUMN sent_at DATETIME NULL`);
  await safeExec(`ALTER TABLE account_payments MODIFY COLUMN method VARCHAR(50) NOT NULL`);
  await safeExec(`ALTER TABLE accounts ADD COLUMN tip_percent_override DECIMAL(5,2) NULL`);
  await safeExec(`ALTER TABLE products ADD COLUMN track_inventory TINYINT(1) NOT NULL DEFAULT 0`);

  await query(
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(20) NOT NULL DEFAULT 'pz',
      current_stock DECIMAL(12,4) NOT NULL DEFAULT 0,
      min_stock DECIMAL(12,4) NOT NULL DEFAULT 0,
      cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS product_recipes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      inventory_item_id INT NOT NULL,
      quantity DECIMAL(12,4) NOT NULL
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      inventory_item_id INT NOT NULL,
      type ENUM('entry', 'exit', 'adjustment') NOT NULL,
      quantity DECIMAL(12,4) NOT NULL,
      reference_type VARCHAR(50),
      reference_id INT,
      note TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const [existingCenters] = await query(`SELECT id FROM operation_centers ORDER BY id LIMIT 1`);
  let defaultCenterId = existingCenters.length ? Number(existingCenters[0].id) : null;
  if (!defaultCenterId) {
    const [inserted] = await query(`INSERT INTO operation_centers (name, is_active) VALUES ('Centro Principal', 1)`);
    defaultCenterId = Number(inserted.insertId);
  }

  await query(`UPDATE restaurant_tables SET operation_center_id = ? WHERE operation_center_id IS NULL`, [defaultCenterId]);
  await query(`UPDATE shifts SET operation_center_id = ? WHERE operation_center_id IS NULL`, [defaultCenterId]);

  const [admins] = await query(`SELECT id FROM staff_users WHERE role = 'admin' LIMIT 1`);
  if (!admins.length) {
    await query(
      `UPDATE staff_users
       SET role = 'admin'
       WHERE role = 'manager'
       ORDER BY id
       LIMIT 1`
    );
  }
}

async function getLogoUrl() {
  const [rows] = await query(
    `SELECT setting_value
     FROM app_settings
     WHERE setting_key = 'logo_url'
     LIMIT 1`
  );
  return String(rows?.[0]?.setting_value || "").trim();
}

async function getLoginBgUrl() {
  const [rows] = await query(
    `SELECT setting_value
     FROM app_settings
     WHERE setting_key = 'login_bg_url'
     LIMIT 1`
  );
  return String(rows?.[0]?.setting_value || "").trim();
}

async function getTipPercent() {
  const [rows] = await query(
    `SELECT setting_value
     FROM app_settings
     WHERE setting_key = 'tip_percent'
     LIMIT 1`
  );
  const pct = Number(rows?.[0]?.setting_value || 0);
  if (Number.isNaN(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

async function getRestaurantName() {
  const [rows] = await query(
    `SELECT setting_value
     FROM app_settings
     WHERE setting_key = 'restaurant_name'
     LIMIT 1`
  );
  const raw = String(rows?.[0]?.setting_value || "").trim();
  return raw || "Mi Restaurante";
}

async function getAccountTotals(accountId) {
  const [items] = await query(
    `SELECT COALESCE(SUM(line_total), 0) AS subtotal
     FROM order_items
     WHERE account_id = ? AND status = 'active'`,
    [accountId]
  );
  const subtotal = money(items[0].subtotal);

  const [discounts] = await query(
    `SELECT type, value FROM account_discounts WHERE account_id = ?`,
    [accountId]
  );
  let discountTotal = 0;
  for (const d of discounts) {
    discountTotal += d.type === "percent" ? subtotal * (Number(d.value) / 100) : Number(d.value);
  }
  discountTotal = Math.min(money(discountTotal), subtotal);
  const [accountRows] = await query(
    `SELECT tip_percent_override
     FROM accounts
     WHERE id = ?
     LIMIT 1`,
    [accountId]
  );
  const overrideTipRaw = accountRows.length ? accountRows[0].tip_percent_override : null;
  const hasOverride = overrideTipRaw !== null && overrideTipRaw !== undefined;
  const overrideTip = hasOverride ? Number(overrideTipRaw) : null;
  const globalTipPercent = await getTipPercent();
  const tipPercent = hasOverride && !Number.isNaN(overrideTip) ? Math.max(0, Math.min(100, overrideTip)) : globalTipPercent;
  const subtotalAfterDiscount = money(subtotal - discountTotal);
  const tipAmount = money(subtotalAfterDiscount * (tipPercent / 100));

  const [payments] = await query(
    `SELECT COALESCE(SUM(amount), 0) AS paid FROM account_payments WHERE account_id = ?`,
    [accountId]
  );
  const paid = money(payments[0].paid);
  const total = money(subtotalAfterDiscount + tipAmount);
  const pending = money(total - paid);
  return { subtotal, discountTotal, tipPercent, tipAmount, total, paid, pending, tipIsOverridden: hasOverride };
}

async function addAccountEvent(accountId, eventType, payload, createdBy) {
  await query(
    `INSERT INTO account_events (account_id, event_type, payload, created_by, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [accountId, eventType, JSON.stringify(payload || {}), createdBy || null, nowSql()]
  );
}

// Endpoint para obtener plantillas de grupos de modificadores
app.get("/api/modifier-templates", (_req, res) => {
  const templates = {
    garnish: {
      type: "garnish",
      label: "Guarniciones",
      description: "Acompañamientos del platillo (Arroz, Papa, Ensalada, etc)",
      defaultMinSelect: 2,
      defaultMaxSelect: 2,
      defaultDisplayMethod: "checkbox",
      defaultIsMandatory: true,
    },
    preparation: {
      type: "preparation",
      label: "Método de Preparación",
      description: "Cómo deseas que se prepare (Al Grill, Frito, Horneado, etc)",
      defaultMinSelect: 1,
      defaultMaxSelect: 1,
      defaultDisplayMethod: "radio",
      defaultIsMandatory: false,
    },
    sauce: {
      type: "sauce",
      label: "Salsas",
      description: "Salsas adicionales para el platillo",
      defaultMinSelect: 0,
      defaultMaxSelect: 2,
      defaultDisplayMethod: "checkbox",
      defaultIsMandatory: false,
    },
    meat_term: {
      type: "meat_term",
      label: "Término de Cocción",
      description: "Punto de cocción de la carne (Rojo, Medio, Bien Cocido)",
      defaultMinSelect: 1,
      defaultMaxSelect: 1,
      defaultDisplayMethod: "radio",
      defaultIsMandatory: true,
    },
    milk_type: {
      type: "milk_type",
      label: "Tipo de Leche",
      description: "Tipo de leche para bebidas (Entera, Deslactosada, Almendra)",
      defaultMinSelect: 1,
      defaultMaxSelect: 1,
      defaultDisplayMethod: "radio",
      defaultIsMandatory: true,
    },
    beverage_temp: {
      type: "beverage_temp",
      label: "Temperatura de Bebida",
      description: "Temperatura de la bebida (Caliente, Frío, Tibio)",
      defaultMinSelect: 1,
      defaultMaxSelect: 1,
      defaultDisplayMethod: "radio",
      defaultIsMandatory: true,
    },
    ice: {
      type: "ice",
      label: "Hielo",
      description: "Preferencia de hielo",
      defaultMinSelect: 0,
      defaultMaxSelect: 1,
      defaultDisplayMethod: "radio",
      defaultIsMandatory: false,
    },
  };
  res.json(templates);
});

app.get("/api/bootstrap", async (_req, res) => {
  const ip = clientIp(_req);
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

  const [waiters] = await query(`SELECT id, full_name FROM staff_users WHERE role IN ('waiter', 'admin')`);
  const [cashiers] = await query(`SELECT id, full_name FROM staff_users WHERE role IN ('cashier', 'admin')`);
  const [categories] = await query(
    `SELECT id, name, color
     FROM product_categories
     WHERE is_active = 1
     ORDER BY sort_order, name`
  );
  let paymentMethods = [];
  try {
    const [rows] = await query(
      `SELECT code, label
       FROM payment_methods
       WHERE is_active = 1
       ORDER BY sort_order, label`
    );
    paymentMethods = rows;
  } catch (_e) {
    paymentMethods = PAYMENT_METHOD_DEFAULTS;
  }
   const [customers] = await query(
    `SELECT id, full_name, discount_type, discount_value
     FROM customers ORDER BY full_name`
   );
   let terminals = [];
   try {
     const [termRows] = await query(`SELECT id, name, operation_center_id, printer_name, printer_ip, printer_port, is_active FROM terminals ORDER BY name`);
     terminals = termRows;
   } catch (_e) {
     terminals = [];
   }
   const restaurantName = await getRestaurantName();
   const logoUrl = await getLogoUrl();
   const loginBgUrl = await getLoginBgUrl();

  res.json({ tables, waiters, cashiers, categories, paymentMethods, customers, centers, defaultCenterId, autoCenterId, terminalIp: ip, restaurantName, logoUrl, loginBgUrl, terminals });
});

app.post("/api/auth/pin-login", async (req, res) => {
  const pin = String(req.body?.pin || "").trim();
  if (!/^\d{4,}$/.test(pin)) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 4 dígitos numéricos" });
  }
  const [rows] = await query(
    `SELECT id, full_name, role, operation_center_id
     FROM staff_users
     WHERE pin_code = ?
     LIMIT 1`,
    [pin]
  );
  if (!rows.length) {
    return res.status(403).json({ error: "Contraseña inválida" });
  }
  const user = rows[0];
  const ip = clientIp(req);
  const allowedModules = await getAllowedModulesForContext(user, ip);
  const authToken = createAuthSession(user);
  res.json({ ok: true, user, allowedModules, authToken });
});

app.get("/api/tables", async (req, res) => {
  const centerId = Number(req.query.centerId || "0");
  const [rows] = await query(
    `SELECT
      t.id, t.code, t.seats, a.name AS area_name, t.operation_center_id,
      (SELECT COUNT(*) FROM accounts WHERE table_id = t.id AND status = 'open') AS open_accounts,
      (SELECT MAX(oi.created_at) FROM accounts ac JOIN order_items oi ON oi.account_id = ac.id AND oi.status = 'active' WHERE ac.table_id = t.id AND ac.status = 'open') AS last_activity_at,
      (SELECT COALESCE(SUM(oi.line_total), 0) FROM accounts ac JOIN order_items oi ON oi.account_id = ac.id AND oi.status = 'active' WHERE ac.table_id = t.id AND ac.status = 'open') AS total,
      (SELECT u.full_name FROM accounts ac JOIN staff_users u ON u.id = ac.waiter_id WHERE ac.table_id = t.id AND ac.status = 'open' ORDER BY ac.opened_at DESC LIMIT 1) AS waiter_name
     FROM restaurant_tables t
     INNER JOIN dining_areas a ON a.id = t.area_id
     WHERE t.is_active = 1 AND (? = 0 OR t.operation_center_id = ?)
     ORDER BY a.name, t.code`,
    [centerId, centerId]
  );
  res.json(rows);
});

app.use("/api/settings", requireAdmin);

app.get("/api/settings", async (_req, res) => {
  const currentIp = clientIp(_req);
  const [operationCenters] = await query(`SELECT id, name, is_active FROM operation_centers ORDER BY id`);
  const [areas] = await query(
    `SELECT id, name, is_active, sort_order
     FROM dining_areas
     ORDER BY sort_order, name`
  );
  const [categories] = await query(
    `SELECT id, name, is_active, sort_order, color
     FROM product_categories
     ORDER BY sort_order, name`
  );
  const [tables] = await query(
    `SELECT t.id, t.code, t.seats, t.is_active, t.area_id, t.operation_center_id, a.name AS area_name
     FROM restaurant_tables t
     INNER JOIN dining_areas a ON a.id = t.area_id
     ORDER BY a.name, t.code`
  );
  const [paymentMethods] = await query(
    `SELECT code, label, is_active, sort_order
     FROM payment_methods
     ORDER BY sort_order, label`
  );
  const [products] = await query(
    `SELECT p.id, p.name, p.category_id, p.base_price, p.allow_discount, p.is_active, c.name AS category_name
     FROM products p
     INNER JOIN product_categories c ON c.id = p.category_id
     ORDER BY p.name`
  );
  const [centerProducts] = await query(
    `SELECT center_id, product_id, is_enabled
     FROM operation_center_products`
  );
  const [terminalBindings] = await query(
    `SELECT ip_address, center_id, label, is_active
     FROM terminal_center_bindings
     ORDER BY ip_address`
  );
  const [groups] = await query(
    `SELECT id, name, group_type, min_select, max_select, is_mandatory, display_method, sort_order, is_active
     FROM modifier_groups
     ORDER BY sort_order, name`
  );
  const [options] = await query(
    `SELECT id, group_id, name, price_delta, sort_order, is_active
     FROM modifier_options
     ORDER BY group_id, sort_order, name`
  );
  const [productSteps] = await query(
    `SELECT product_id, group_id, sort_order
     FROM product_modifier_groups
     ORDER BY product_id, sort_order`
  );
  const [discountPresets] = await query(
    `SELECT id, name, type, value, is_active, sort_order
     FROM discount_presets
     ORDER BY sort_order, name`
  );
  const [modules] = await query(
    `SELECT code, label, is_active, sort_order
     FROM app_modules
     ORDER BY sort_order, code`
  );
  const [staffUsers] = await query(
    `SELECT id, full_name, role
     FROM staff_users
     ORDER BY full_name`
  );
  const [userModulePermissions] = await query(
    `SELECT user_id, module_code, is_enabled
     FROM user_module_permissions`
  );
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
  const tipPercent = await getTipPercent();
  const restaurantName = await getRestaurantName();
  const logoUrl = await getLogoUrl();
  const loginBgUrl = await getLoginBgUrl();
  res.json({
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
    currentIp,
    tipPercent,
    restaurantName,
    logoUrl,
    loginBgUrl,
  });
});

app.post("/api/settings/branding", async (req, res) => {
  const restaurantName = String(req.body?.restaurantName || "").trim();
  if (!restaurantName) return res.status(400).json({ error: "restaurantName es requerido" });
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('restaurant_name', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [restaurantName.slice(0, 120)]
  );
  res.json({ ok: true, restaurantName: restaurantName.slice(0, 120) });
});

app.post("/api/settings/logo", async (req, res) => {
  const logoData = String(req.body?.logoData || "").trim();
  if (!logoData) return res.status(400).json({ error: "logoData es requerido" });

  const base64Match = logoData.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,(.+)$/);
  if (!base64Match) {
    return res.status(400).json({ error: "Formato de imagen inválido. Usa PNG, JPG, GIF, WebP o SVG." });
  }

  const ext = base64Match[1].replace('svg+xml', 'svg');
  const fileName = `logo_${Date.now()}.${ext}`;
  const uploadsDir = path.join(__dirname, "public", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(base64Match[2], "base64");
  fs.writeFileSync(filePath, buffer);

  const logoUrl = `/uploads/${fileName}`;

  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('logo_url', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [logoUrl]
  );

  res.json({ ok: true, logoUrl });
});

app.post("/api/settings/login-bg", async (req, res) => {
  const bgData = String(req.body?.bgData || "").trim();
  if (!bgData) return res.status(400).json({ error: "bgData es requerido" });

  const base64Match = bgData.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
  if (!base64Match) {
    return res.status(400).json({ error: "Formato de imagen inválido. Usa PNG, JPG, GIF o WebP." });
  }

  const ext = base64Match[1].replace('jpeg', 'jpg');
  const fileName = `login_bg_${Date.now()}.${ext}`;
  const uploadsDir = path.join(__dirname, "public", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(base64Match[2], "base64");
  fs.writeFileSync(filePath, buffer);

  const loginBgUrl = `/uploads/${fileName}`;

  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('login_bg_url', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [loginBgUrl]
  );

  res.json({ ok: true, loginBgUrl });
});

app.post("/api/settings/tip-config", async (req, res) => {
  const { tipPercent = 0 } = req.body || {};
  const pct = Number(tipPercent);
  if (Number.isNaN(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ error: "tipPercent debe estar entre 0 y 100" });
  }
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('tip_percent', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [String(Number(pct.toFixed(2)))]
  );
  res.json({ ok: true, tipPercent: Number(pct.toFixed(2)) });
});

app.post("/api/settings/user-modules", async (req, res) => {
  const userId = Number(req.body?.userId || 0);
  const requestedCodes = Array.isArray(req.body?.moduleCodes) ? req.body.moduleCodes : [];
  if (!userId) return res.status(400).json({ error: "userId es requerido" });

  const [userRows] = await query(`SELECT id FROM staff_users WHERE id = ? LIMIT 1`, [userId]);
  if (!userRows.length) return res.status(404).json({ error: "Usuario no encontrado" });

  const [modules] = await query(`SELECT code FROM app_modules WHERE is_active = 1 ORDER BY sort_order, code`);
  const validCodes = modules.map((m) => String(m.code || "").trim());
  const selectedSet = new Set(
    requestedCodes.map((c) => String(c || "").trim()).filter((c) => validCodes.includes(c))
  );

  for (const code of validCodes) {
    await query(
      `INSERT INTO user_module_permissions (user_id, module_code, is_enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
      [userId, code, selectedSet.has(code) ? 1 : 0]
    );
  }
  res.json({ ok: true, userId, enabledCount: selectedSet.size });
});

app.post("/api/settings/device-modules", async (req, res) => {
  const targetIp = String(req.body?.ipAddress || clientIp(req) || "").trim();
  const requestedCodes = Array.isArray(req.body?.moduleCodes) ? req.body.moduleCodes : [];
  if (!targetIp) return res.status(400).json({ error: "ipAddress es requerido" });

  const [modules] = await query(`SELECT code FROM app_modules WHERE is_active = 1 ORDER BY sort_order, code`);
  const validCodes = modules.map((m) => String(m.code || "").trim());
  const selectedSet = new Set(
    requestedCodes.map((c) => String(c || "").trim()).filter((c) => validCodes.includes(c))
  );

  for (const code of validCodes) {
    await query(
      `INSERT INTO terminal_module_bindings (ip_address, module_code, is_enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
      [targetIp, code, selectedSet.has(code) ? 1 : 0]
    );
  }
  res.json({ ok: true, ipAddress: targetIp, enabledCount: selectedSet.size });
});

app.post("/api/accounts/:accountId/remove-tip", async (req, res) => {
  const accountId = Number(req.params.accountId);
  if (!accountId) return res.status(400).json({ error: "accountId invalido" });
  const [accountRows] = await query(
    `SELECT id, status
     FROM accounts
     WHERE id = ?
     LIMIT 1`,
    [accountId]
  );
  if (!accountRows.length) return res.status(404).json({ error: "Cuenta no encontrada" });
  if (String(accountRows[0].status) !== "open") {
    return res.status(400).json({ error: "Solo cuentas abiertas permiten quitar propina" });
  }
  await query(`UPDATE accounts SET tip_percent_override = 0 WHERE id = ?`, [accountId]);
  const totals = await getAccountTotals(accountId);
  await addAccountEvent(accountId, "tip_removed", { tipPercent: 0 }, null);
  res.json({ ok: true, totals });
});

app.post("/api/accounts/:accountId/restore-tip", async (req, res) => {
  const accountId = Number(req.params.accountId);
  if (!accountId) return res.status(400).json({ error: "accountId invalido" });
  const [accountRows] = await query(
    `SELECT id, status
     FROM accounts
     WHERE id = ?
     LIMIT 1`,
    [accountId]
  );
  if (!accountRows.length) return res.status(404).json({ error: "Cuenta no encontrada" });
  if (String(accountRows[0].status) !== "open") {
    return res.status(400).json({ error: "Solo cuentas abiertas permiten restaurar propina" });
  }
  await query(`UPDATE accounts SET tip_percent_override = NULL WHERE id = ?`, [accountId]);
  const totals = await getAccountTotals(accountId);
  await addAccountEvent(accountId, "tip_restored", { tipPercent: totals.tipPercent }, null);
  res.json({ ok: true, totals });
});

app.post("/api/settings/tables", async (req, res) => {
  const { code, seats = 4, isActive = 1, centerId } = req.body || {};
  if (!code || !centerId) return res.status(400).json({ error: "centerId y code son requeridos" });
  const [areas] = await query(`SELECT id FROM dining_areas LIMIT 1`);
  const areaId = areas.length > 0 ? areas[0].id : 1;
  await query(
    `INSERT INTO restaurant_tables (area_id, operation_center_id, code, seats, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [areaId, Number(centerId), String(code).trim(), Number(seats) || 4, Number(isActive) ? 1 : 0]
  );
  res.status(201).json({ ok: true });
});

app.post("/api/settings/tables/:tableId", async (req, res) => {
  const tableId = Number(req.params.tableId);
  const { code, seats = 4, isActive = 1, centerId } = req.body || {};
  if (!tableId || !code || !centerId) {
    return res.status(400).json({ error: "tableId, centerId y code son requeridos" });
  }
  const [areas] = await query(`SELECT id FROM dining_areas LIMIT 1`);
  const areaId = areas.length > 0 ? areas[0].id : 1;
  await query(
    `UPDATE restaurant_tables
     SET area_id = ?, operation_center_id = ?, code = ?, seats = ?, is_active = ?
     WHERE id = ?`,
    [areaId, Number(centerId), String(code).trim(), Number(seats) || 4, Number(isActive) ? 1 : 0, tableId]
  );
  res.json({ ok: true });
});

app.delete("/api/settings/tables/:tableId", async (req, res) => {
  const tableId = Number(req.params.tableId);
  if (!tableId) return res.status(400).json({ error: "tableId es requerido" });
  try {
    const [accounts] = await query(`SELECT id FROM accounts WHERE table_id = ?`, [tableId]);
    if (accounts.length > 0) {
      return res.status(400).json({ error: "No se puede eliminar la mesa porque tiene cuentas asociadas" });
    }
    await query(`UPDATE accounts SET table_id = NULL WHERE table_id = ?`, [tableId]);
    await query(`DELETE FROM restaurant_tables WHERE id = ?`, [tableId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting table:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/categories", async (req, res) => {
  const { name, isActive = 1, sortOrder = 0, color = '#6366f1' } = req.body || {};
  if (!name) return res.status(400).json({ error: "name es requerido" });
  const [result] = await query(
    `INSERT INTO product_categories (name, is_active, sort_order, color)
     VALUES (?, ?, ?, ?)`,
    [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, String(color || '#6366f1').trim()]
  );
  res.status(201).json({ categoryId: result.insertId });
});

app.post("/api/settings/categories/:categoryId", async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const { name, isActive = 1, sortOrder = 0 } = req.body || {};
  if (!categoryId || !name) return res.status(400).json({ error: "categoryId y name son requeridos" });
  await query(
    `UPDATE product_categories
     SET name = ?, is_active = ?, sort_order = ?, color = ?
     WHERE id = ?`,
    [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, String(color || '#6366f1').trim(), categoryId]
  );
  res.json({ ok: true });
})


// Reorder categories (batch sort_order update)
app.post("/api/settings/categories/reorder", async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || !order.length) {
      return res.status(400).json({ error: "Se requiere un arreglo 'order' con { id, sortOrder }" });
    }
    const pool = require("./src/db").pool;
    for (const item of order) {
      if (!item.id || typeof item.sortOrder !== "number") continue;
      await pool.execute(
        "UPDATE product_categories SET sort_order = ? WHERE id = ?",
        [item.sortOrder, item.id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error reordering categories:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/settings/categories/:categoryId", async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  if (!categoryId) return res.status(400).json({ error: "categoryId es requerido" });
  try {
    const [products] = await query(`SELECT id FROM products WHERE category_id = ? LIMIT 1`, [categoryId]);
    if (products.length > 0) {
      return res.status(400).json({ error: "No se puede eliminar la categoría porque tiene productos asociados" });
    }
    await query(`DELETE FROM product_categories WHERE id = ?`, [categoryId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/areas", async (req, res) => {
  const { name, isActive = 1, sortOrder = 0, color = '#6366f1' } = req.body || {};
  if (!name) return res.status(400).json({ error: "name es requerido" });
  const [result] = await query(
    `INSERT INTO dining_areas (name, is_active, sort_order)
     VALUES (?, ?, ?)`,
    [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0]
  );
  res.status(201).json({ areaId: result.insertId });
});

app.post("/api/settings/areas/:areaId", async (req, res) => {
  const areaId = Number(req.params.areaId);
  const { name, isActive = 1, sortOrder = 0 } = req.body || {};
  if (!areaId || !name) return res.status(400).json({ error: "areaId y name son requeridos" });
  await query(
    `UPDATE dining_areas
     SET name = ?, is_active = ?, sort_order = ?
     WHERE id = ?`,
    [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, areaId]
  );
  res.json({ ok: true });
});

app.post("/api/settings/operation-centers", async (req, res) => {
  const { name, tableCount = 0, tablePrefix = "M" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name es requerido" });
  const [inserted] = await query(
    `INSERT INTO operation_centers (name, is_active) VALUES (?, 1)`,
    [String(name).trim()]
  );
  const centerId = Number(inserted.insertId);
  res.status(201).json({ centerId });
});

app.post("/api/settings/operation-centers/:centerId", async (req, res) => {
  const centerId = Number(req.params.centerId);
  const { name, isActive = 1 } = req.body || {};
  if (!centerId || !name) return res.status(400).json({ error: "centerId y name son requeridos" });
  await query(
    `UPDATE operation_centers
     SET name = ?, is_active = ?
     WHERE id = ?`,
    [String(name).trim(), Number(isActive) ? 1 : 0, centerId]
  );
  res.json({ ok: true });
});

app.post("/api/settings/operation-centers/:centerId/products", async (req, res) => {
  const centerId = Number(req.params.centerId);
  const { productId, isEnabled = 1 } = req.body || {};
  if (!centerId || !productId) return res.status(400).json({ error: "centerId y productId son requeridos" });
  await query(
    `INSERT INTO operation_center_products (center_id, product_id, is_enabled)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)`,
    [centerId, Number(productId), Number(isEnabled) ? 1 : 0]
  );
  res.status(201).json({ ok: true });
});

app.delete("/api/settings/operation-centers/:centerId", async (req, res) => {
  const centerId = Number(req.params.centerId);
  if (!centerId) return res.status(400).json({ error: "centerId es requerido" });
  try {
    const [accounts] = await query(`SELECT id FROM accounts WHERE operation_center_id = ? LIMIT 1`, [centerId]);
    if (accounts.length > 0) {
      return res.status(400).json({ error: "No se puede eliminar el centro porque tiene cuentas asociadas" });
    }
    const [tables] = await query(`SELECT id FROM restaurant_tables WHERE operation_center_id = ? LIMIT 1`, [centerId]);
    if (tables.length > 0) {
      return res.status(400).json({ error: "No se puede eliminar el centro porque tiene mesas asociadas" });
    }
    await query(`DELETE FROM operation_center_products WHERE center_id = ?`, [centerId]);
    await query(`DELETE FROM operation_centers WHERE id = ?`, [centerId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting center:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/terminal-binding", async (req, res) => {
  const { centerId, ipAddress = null, label = "" } = req.body || {};
  const ip = String(ipAddress || clientIp(req) || "").replace("::ffff:", "").trim();
  if (!centerId || !ip) return res.status(400).json({ error: "centerId e ip son requeridos" });
  await query(
    `INSERT INTO terminal_center_bindings (ip_address, center_id, label, is_active)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE center_id = VALUES(center_id), label = VALUES(label), is_active = 1`,
    [ip, Number(centerId), String(label || "").trim()]
  );
  res.status(201).json({ ok: true, ip, centerId: Number(centerId) });
});

app.post("/api/settings/products", async (req, res) => {
  const { categoryId, name, basePrice = 0, allowDiscount = 1, trackInventory = 0 } = req.body || {};
  if (!categoryId || !name) return res.status(400).json({ error: "categoryId y name son requeridos" });
  const [result] = await query(
    `INSERT INTO products (category_id, name, base_price, allow_discount, is_active, track_inventory)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [Number(categoryId), String(name).trim(), Number(basePrice) || 0, Number(allowDiscount) ? 1 : 0, Number(trackInventory) ? 1 : 0]
  );
  res.status(201).json({ productId: result.insertId });
});

app.post("/api/settings/products/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const { categoryId, name, basePrice = 0, allowDiscount = 1, isActive = 1, trackInventory = 0 } = req.body || {};
  if (!productId || !categoryId || !name) {
    return res.status(400).json({ error: "productId, categoryId y name son requeridos" });
  }
  await query(
    `UPDATE products
     SET category_id = ?, name = ?, base_price = ?, allow_discount = ?, is_active = ?, track_inventory = ?
     WHERE id = ?`,
    [Number(categoryId), String(name).trim(), Number(basePrice) || 0, Number(allowDiscount) ? 1 : 0, Number(isActive) ? 1 : 0, Number(trackInventory) ? 1 : 0, productId]
  );
  res.json({ ok: true });
});

// Nuevo endpoint para crear un platillo completo con sus modificadores
app.post("/api/settings/products-complete", async (req, res) => {
  const {
    categoryId,
    name,
    basePrice = 0,
    allowDiscount = 1,
    modifierGroups = [] // Array de {groupType, minSelect, maxSelect, isMandatory, options: [{name, priceDelta}]}
  } = req.body || {};

  if (!categoryId || !name) {
    return res.status(400).json({ error: "categoryId y name son requeridos" });
  }

  try {
    // 1. Crear el producto
    const [productResult] = await query(
      `INSERT INTO products (category_id, name, base_price, allow_discount, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [Number(categoryId), String(name).trim(), Number(basePrice) || 0, Number(allowDiscount) ? 1 : 0]
    );
    const productId = productResult.insertId;

    // 2. Procesar los grupos de modificadores
    let sortOrder = 0;
    for (const mgConfig of modifierGroups) {
      const { groupType, minSelect = null, maxSelect = null, isMandatory = null, options = [] } = mgConfig;
      if (!groupType) continue;

      // Obtener configuración del template
      const templates = {
        garnish: { name: "Guarniciones", min: 2, max: 2, mandatory: 1, display: "checkbox" },
        preparation: { name: "Método de Preparación", min: 1, max: 1, mandatory: 0, display: "radio" },
        sauce: { name: "Salsas", min: 0, max: 2, mandatory: 0, display: "checkbox" },
        meat_term: { name: "Término de Cocción", min: 1, max: 1, mandatory: 1, display: "radio" },
        milk_type: { name: "Tipo de Leche", min: 1, max: 1, mandatory: 1, display: "radio" },
        beverage_temp: { name: "Temperatura", min: 1, max: 1, mandatory: 1, display: "radio" },
        ice: { name: "Hielo", min: 0, max: 1, mandatory: 0, display: "radio" },
      };

      const template = templates[groupType] || { name: groupType, min: 0, max: 1, mandatory: 0, display: "radio" };
      const finalMin = Math.max(0, Number(minSelect ?? template.min ?? 0));
      const finalMax = Math.max(finalMin, Number(maxSelect ?? template.max ?? 1));
      const finalMandatory = isMandatory === null || typeof isMandatory === "undefined" ? Number(template.mandatory) : Number(Boolean(isMandatory));
      if (finalMax <= 0) {
        return res.status(400).json({ error: `Config invalida para ${template.name}: maxSelect debe ser mayor que 0` });
      }
      if (!Array.isArray(options) || !options.length) {
        return res.status(400).json({ error: `Config invalida para ${template.name}: debes enviar opciones` });
      }

      // Crear un grupo por producto para permitir opciones especificas por platillo
      const [groupResult] = await query(
        `INSERT INTO modifier_groups (name, group_type, min_select, max_select, is_mandatory, display_method, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [template.name, groupType, finalMin, finalMax, finalMandatory ? 1 : 0, template.display, sortOrder]
      );
      const groupId = groupResult.insertId;

      // Agregar opciones al grupo (evitar duplicados)
      for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
        const option = options[optionIndex];
        if (!option.name) continue;
        const priceDelta = Number(option.priceDelta) || 0;
        await query(
          `INSERT INTO modifier_options (group_id, name, price_delta, sort_order)
           VALUES (?, ?, ?, ?)`,
          [groupId, String(option.name).trim(), priceDelta, optionIndex + 1]
        );
      }

      // Asignar grupo al producto
      await query(
        `INSERT INTO product_modifier_groups (product_id, group_id, sort_order)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE sort_order = ?`,
        [productId, groupId, sortOrder, sortOrder]
      );

      sortOrder++;
    }

    res.status(201).json({ productId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/payment-methods", async (req, res) => {
  const { code, label, isActive = 1, sortOrder = 0 } = req.body || {};
  const normalizedCode = normalizePaymentMethodCode(code);
  const normalizedLabel = String(label || "").trim();
  if (!normalizedCode || !normalizedLabel) return res.status(400).json({ error: "code y label son requeridos" });
  if (normalizedCode.length > 30) return res.status(400).json({ error: "code maximo 30 caracteres" });

  await query(
    `INSERT INTO payment_methods (code, label, is_active, sort_order)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       label = VALUES(label),
       is_active = VALUES(is_active),
       sort_order = VALUES(sort_order)`,
    [normalizedCode, normalizedLabel, Number(isActive) ? 1 : 0, Number(sortOrder) || 0]
  );
  res.status(201).json({ ok: true });
});

app.post("/api/settings/modifier-groups", async (req, res) => {
  const { name, minSelect = 0, maxSelect = 1, sortOrder = 0, isActive = 1, groupType = "other" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name es requerido" });
  const min = Number(minSelect) || 0;
  const max = Number(maxSelect) || 0;
  if (max < min) return res.status(400).json({ error: "maxSelect no puede ser menor que minSelect" });
  const normalizedType = normalizeGroupType(groupType);
  const MODIFIER_GROUP_DEFAULTS = {
    garnish: { displayMethod: "checkbox", isMandatory: 1 },
    preparation: { displayMethod: "radio", isMandatory: 0 },
    sauce: { displayMethod: "checkbox", isMandatory: 0 },
    meat_term: { displayMethod: "radio", isMandatory: 1 },
    milk_type: { displayMethod: "radio", isMandatory: 0 },
    beverage_temp: { displayMethod: "radio", isMandatory: 1 },
    ice: { displayMethod: "radio", isMandatory: 0 },
    other: { displayMethod: "buttons", isMandatory: 0 },
  };
  const defaults = MODIFIER_GROUP_DEFAULTS[normalizedType] || MODIFIER_GROUP_DEFAULTS.other;

  const [result] = await query(
    `INSERT INTO modifier_groups (name, group_type, min_select, max_select, is_mandatory, display_method, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(name).trim(),
      normalizedType,
      min,
      max,
      Number(defaults.isMandatory) ? 1 : 0,
      String(defaults.displayMethod || "buttons"),
      Number(sortOrder) || 0,
      Number(isActive) ? 1 : 0,
    ]
  );
  res.status(201).json({ groupId: result.insertId });
});

app.post("/api/settings/modifier-groups/:groupId", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { name, minSelect = 0, maxSelect = 1, sortOrder = 0, isActive = 1, groupType = "other" } = req.body || {};
  if (!groupId || !name) return res.status(400).json({ error: "groupId y name son requeridos" });
  const min = Number(minSelect) || 0;
  const max = Number(maxSelect) || 0;
  if (max < min) return res.status(400).json({ error: "maxSelect no puede ser menor que minSelect" });
  const normalizedType = normalizeGroupType(groupType);
  await query(
    `UPDATE modifier_groups
     SET name = ?, group_type = ?, min_select = ?, max_select = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [String(name).trim(), normalizedType, min, max, Number(sortOrder) || 0, Number(isActive) ? 1 : 0, groupId]
  );
  res.json({ ok: true });
});

app.post("/api/settings/modifier-groups/:groupId/options", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const { name, priceDelta = 0, sortOrder = 0, isActive = 1 } = req.body || {};
  if (!groupId || !name) return res.status(400).json({ error: "groupId y name son requeridos" });
  await query(
    `INSERT INTO modifier_options (group_id, name, price_delta, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [groupId, String(name).trim(), Number(priceDelta) || 0, Number(sortOrder) || 0, Number(isActive) ? 1 : 0]
  );
  res.status(201).json({ ok: true });
});

app.post("/api/settings/modifier-options/:optionId", async (req, res) => {
  const optionId = Number(req.params.optionId);
  const { name, priceDelta = 0, sortOrder = 0, isActive = 1 } = req.body || {};
  if (!optionId || !name) return res.status(400).json({ error: "optionId y name son requeridos" });
  await query(
    `UPDATE modifier_options
     SET name = ?, price_delta = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [String(name).trim(), Number(priceDelta) || 0, Number(sortOrder) || 0, Number(isActive) ? 1 : 0, optionId]
  );
  res.json({ ok: true });
});

app.delete("/api/settings/modifier-options/:optionId", async (req, res) => {
  const optionId = Number(req.params.optionId);
  if (!optionId) return res.status(400).json({ error: "optionId es requerido" });
  try {
    await query(`DELETE FROM modifier_options WHERE id = ?`, [optionId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting modifier option:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/settings/modifier-groups/:groupId", async (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!groupId) return res.status(400).json({ error: "groupId es requerido" });
  try {
    const [products] = await query(`
      SELECT p.id, p.name FROM products p
      JOIN product_modifier_groups pmg ON pmg.product_id = p.id
      WHERE pmg.group_id = ?
    `, [groupId]);
    if (products.length > 0) {
      const names = products.map(p => p.name).join(', ');
      return res.status(400).json({
        error: `Está asignado a: ${names}`,
        products: products
      });
    }
    await query(`DELETE FROM modifier_options WHERE group_id = ?`, [groupId]);
    await query(`DELETE FROM modifier_groups WHERE id = ?`, [groupId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting modifier group:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/product-steps", async (req, res) => {
  const { productId, groupId, sortOrder = 0 } = req.body || {};
  if (!productId || !groupId) return res.status(400).json({ error: "productId y groupId son requeridos" });
  await query(
    `INSERT INTO product_modifier_groups (product_id, group_id, sort_order)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)`,
    [Number(productId), Number(groupId), Number(sortOrder) || 0]
  );
  res.status(201).json({ ok: true });
});

app.delete("/api/settings/product-steps/:productId/:groupId", async (req, res) => {
  const productId = Number(req.params.productId);
  const groupId = Number(req.params.groupId);
  if (!productId || !groupId) return res.status(400).json({ error: "productId y groupId son requeridos" });
  await query(`DELETE FROM product_modifier_groups WHERE product_id = ? AND group_id = ?`, [productId, groupId]);
  res.json({ ok: true });
});

app.delete("/api/settings/product-steps/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  if (!productId) return res.status(400).json({ error: "productId es requerido" });
  await query(`DELETE FROM product_modifier_groups WHERE product_id = ?`, [productId]);
  res.json({ ok: true });
});

app.post("/api/settings/discount-presets", async (req, res) => {
  const { name, type, value = 0, isActive = 1, sortOrder = 0 } = req.body || {};
  if (!name || !["percent", "fixed"].includes(type)) {
    return res.status(400).json({ error: "name y type (percent|fixed) son requeridos" });
  }
  await query(
    `INSERT INTO discount_presets (name, type, value, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [String(name).trim(), type, Number(value) || 0, Number(isActive) ? 1 : 0, Number(sortOrder) || 0]
  );
  res.status(201).json({ ok: true });
});

// Production Centers
app.post("/api/settings/production-centers", async (req, res) => {
  const { name, printerName = '', isActive = 1 } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "name es requerido" });
  }
  const [result] = await query(
    `INSERT INTO production_centers (name, printer_name, is_active)
     VALUES (?, ?, ?)`,
    [String(name).trim(), String(printerName).trim(), Number(isActive) ? 1 : 0]
  );
  res.status(201).json({ centerId: result.insertId });
});

app.post("/api/settings/production-centers/:centerId", async (req, res) => {
  const centerId = Number(req.params.centerId);
  const { name, printerName = '', isActive = 1 } = req.body || {};
  if (!centerId || !name) {
    return res.status(400).json({ error: "centerId y name son requeridos" });
  }
  await query(
    `UPDATE production_centers SET name = ?, printer_name = ?, is_active = ? WHERE id = ?`,
    [String(name).trim(), String(printerName).trim(), Number(isActive) ? 1 : 0, centerId]
  );
  res.json({ ok: true });
});

// Link product to production centers
app.post("/api/settings/products/:productId/production-centers", async (req, res) => {
  const productId = Number(req.params.productId);
  const { centerIds = [] } = req.body || {};
  if (!productId) {
    return res.status(400).json({ error: "productId es requerido" });
  }
  await query(`DELETE FROM product_production_centers WHERE product_id = ?`, [productId]);
  for (const centerId of centerIds) {
    await query(
      `INSERT INTO product_production_centers (product_id, center_id) VALUES (?, ?)`,
      [productId, Number(centerId)]
    );
  }
  res.json({ ok: true });
});

app.delete("/api/settings/products/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  if (!productId) return res.status(400).json({ error: "productId es requerido" });
  try {
    const [accounts] = await query(`SELECT id FROM order_items WHERE product_id = ? LIMIT 1`, [productId]);
    if (accounts.length > 0) {
      return res.status(400).json({ error: "No se puede eliminar el producto porque tiene ventas asociadas" });
    }
    await query(`DELETE FROM product_production_centers WHERE product_id = ?`, [productId]);
    await query(`DELETE FROM product_modifier_groups WHERE product_id = ?`, [productId]);
    await query(`DELETE FROM products WHERE id = ?`, [productId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/discount-presets/:presetId", async (req, res) => {
  const presetId = Number(req.params.presetId);
  const { name, type, value = 0, isActive = 1, sortOrder = 0 } = req.body || {};
  if (!presetId || !name || !["percent", "fixed"].includes(type)) {
    return res.status(400).json({ error: "presetId, name y type (percent|fixed) son requeridos" });
  }
  await query(
    `UPDATE discount_presets
     SET name = ?, type = ?, value = ?, is_active = ?, sort_order = ?
     WHERE id = ?`,
    [String(name).trim(), type, Number(value) || 0, Number(isActive) ? 1 : 0, Number(sortOrder) || 0, presetId]
  );
  res.json({ ok: true });
});

app.post("/api/settings/staff-users", async (req, res) => {
  const { fullName, pinCode, role = 'waiter', operationCenterId = null } = req.body || {};
  if (!fullName || !pinCode) {
    return res.status(400).json({ error: "fullName y pinCode son requeridos" });
  }
  const [result] = await query(
    `INSERT INTO staff_users (full_name, pin_code, role, operation_center_id) VALUES (?, ?, ?, ?)`,
    [String(fullName).trim(), String(pinCode).trim(), role, operationCenterId ? Number(operationCenterId) : null]
  );
  res.status(201).json({ userId: result.insertId });
});

app.post("/api/settings/staff-users/:userId/center", async (req, res) => {
  const userId = Number(req.params.userId);
  const { operationCenterId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "userId es requerido" });
  }
  await query(
    `UPDATE staff_users SET operation_center_id = ? WHERE id = ?`,
    [operationCenterId ? Number(operationCenterId) : null, userId]
  );
  res.json({ ok: true });
});

// Terminals
app.post("/api/settings/terminals", async (req, res) => {
  const { operationCenterId, name, printerName = null, printerIp = null, printerPort = 9100 } = req.body || {};
  if (!operationCenterId || !name) {
    return res.status(400).json({ error: "operationCenterId y name son requeridos" });
  }
  const [result] = await query(
    `INSERT INTO terminals (operation_center_id, name, printer_name, printer_ip, printer_port) VALUES (?, ?, ?, ?, ?)`,
    [Number(operationCenterId), String(name).trim(), printerName || null, printerIp || null, Number(printerPort) || 9100]
  );
  res.status(201).json({ terminalId: result.insertId });
});

app.post("/api/settings/terminals/:terminalId", async (req, res) => {
  const terminalId = Number(req.params.terminalId);
  const { operationCenterId, name, printerName, printerIp, printerPort = 9100, isActive = 1 } = req.body || {};
  if (!terminalId || !operationCenterId || !name) {
    return res.status(400).json({ error: "terminalId, operationCenterId y name son requeridos" });
  }
  await query(
    `UPDATE terminals SET operation_center_id = ?, name = ?, printer_name = ?, printer_ip = ?, printer_port = ?, is_active = ? WHERE id = ?`,
    [Number(operationCenterId), String(name).trim(), printerName || null, printerIp || null, Number(printerPort) || 9100, Number(isActive) ? 1 : 0, terminalId]
  );
  res.json({ ok: true });
});

app.delete("/api/settings/terminals/:terminalId", async (req, res) => {
  const terminalId = Number(req.params.terminalId);
  if (!terminalId) {
    return res.status(400).json({ error: "terminalId es requerido" });
  }
  await query(`DELETE FROM terminals WHERE id = ?`, [terminalId]);
  res.json({ ok: true });
});

app.post("/api/tables/:tableId/accounts", async (req, res) => {
  const tableId = Number(req.params.tableId);
  const { waiterId, guestCount = 1, customerId = null, centerId = null } = req.body || {};
  if (!tableId || !waiterId) {
    return res.status(400).json({ error: "tableId y waiterId son requeridos" });
  }

  const [tableRows] = await query(`SELECT operation_center_id FROM restaurant_tables WHERE id = ?`, [tableId]);
  if (!tableRows.length) return res.status(404).json({ error: "Mesa no encontrada" });
  const tableCenterId = Number(tableRows[0].operation_center_id || 0);
  const finalCenterId = Number(centerId || tableCenterId || 0);

  const [openShift] = await query(
    `SELECT id
     FROM shifts
     WHERE status = 'open' AND operation_center_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [finalCenterId]
  );
  const shiftId = openShift.length ? openShift[0].id : null;
  // check_number is VARCHAR(20), keep temporary value short.
  const tempCheckNumber = `TMP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;

  const [result] = await query(
    `INSERT INTO accounts (table_id, operation_center_id, waiter_id, shift_id, customer_id, status, guest_count, check_number, opened_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    [tableId, finalCenterId, waiterId, shiftId, customerId, guestCount, tempCheckNumber, nowSql()]
  );
  const checkNumber = `CHK-${String(Number(result.insertId || 0)).padStart(4, "0")}`;
  await query(`UPDATE accounts SET check_number = ? WHERE id = ?`, [checkNumber, Number(result.insertId)]);
  await addAccountEvent(result.insertId, "account_opened", { guestCount }, waiterId);
  res.status(201).json({ accountId: result.insertId, checkNumber });
});

app.get("/api/tables/:tableId/accounts", async (req, res) => {
  const tableId = Number(req.params.tableId);
  const [rows] = await query(
    `SELECT a.id, a.check_number, a.guest_count, a.waiter_id, u.full_name AS waiter_name, a.opened_at
     FROM accounts a
     INNER JOIN staff_users u ON u.id = a.waiter_id
     WHERE a.table_id = ? AND a.status = 'open'
     ORDER BY a.opened_at`,
    [tableId]
  );
  const enriched = [];
  for (const row of rows) {
    const totals = await getAccountTotals(row.id);
    enriched.push({ ...row, totals });
  }
  res.json(enriched);
});

app.get("/api/accounts/by-check/:checkNumber", async (req, res) => {
  const checkNumber = String(req.params.checkNumber || "").trim();
  if (!checkNumber) return res.status(400).json({ error: "checkNumber es requerido" });
  const [rows] = await query(
    `SELECT id, check_number, status
     FROM accounts
     WHERE check_number = ?
     ORDER BY id DESC
     LIMIT 1`,
    [checkNumber]
  );
  if (!rows.length) return res.status(404).json({ error: "Cuenta no encontrada para ese check" });
  res.json(rows[0]);
});

app.get("/api/accounts/open", async (req, res) => {
  try {
    const centerId = Number(req.query.centerId || "0");
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.status, a.table_id, a.waiter_id, a.guest_count, a.opened_at,
              t.code AS table_code, t.operation_center_id,
              u.full_name AS waiter_name,
              oc.name AS center_name,
              (SELECT COALESCE(SUM(oi.line_total), 0) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS total,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS item_count,
              (SELECT MAX(oi.created_at) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS last_activity
       FROM accounts a
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
       WHERE a.status = 'open' AND (? = 0 OR t.operation_center_id = ?)
       ORDER BY a.opened_at DESC`,
      [centerId, centerId]
    );

    // Attach top 5 items per account
    const accountIds = rows.map(r => Number(r.id));
    if (accountIds.length > 0) {
      const placeholders = accountIds.map(() => '?').join(',');
      const [items] = await query(
        `SELECT oi.account_id, p.name AS product_name, oi.qty, oi.line_total
         FROM order_items oi
         INNER JOIN products p ON p.id = oi.product_id
         WHERE oi.account_id IN (${placeholders}) AND oi.status = 'active'
         ORDER BY oi.created_at ASC`,
        accountIds
      );
      const itemsByAccount = {};
      items.forEach(item => {
        if (!itemsByAccount[item.account_id]) itemsByAccount[item.account_id] = [];
        itemsByAccount[item.account_id].push(item);
      });
      rows.forEach(r => {
        r.items = (itemsByAccount[r.id] || []).slice(0, 5);
      });
    }
    rows.forEach(r => { if (!r.items) r.items = []; });

    res.json(rows);
  } catch (err) {
    console.error('Error en /api/accounts/open:', err);
    res.status(500).json({ error: err.message });
  }
});

// Precuenta (devuelve datos para imprimir)
app.post("/api/accounts/:accountId/precheck", async (req, res) => {
  try {
    const accountId = Number(req.params.accountId);
    const [accountRows] = await query(
      `SELECT a.*, t.code AS table_code, u.full_name AS waiter_name,
              oc.name AS center_name
       FROM accounts a
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
       WHERE a.id = ?`,
      [accountId]
    );
    if (!accountRows.length) return res.status(404).json({ error: "Cuenta no encontrada" });
    const account = accountRows[0];

    const [items] = await query(
      `SELECT oi.*, p.name AS product_name
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id = ? AND oi.status = 'active'
       ORDER BY oi.created_at`,
      [accountId]
    );

    res.json({ account, items });
  } catch (err) {
    console.error('Error en precheck:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/catalog/products", async (req, res) => {
  const categoryId = Number(req.query.categoryId);
  const centerId = Number(req.query.centerId || "0");
  let centerFilter = "";
  let centerParams = [];
  if (centerId > 0) {
    centerFilter = `
      AND (
        NOT EXISTS (SELECT 1 FROM operation_center_products ocpx WHERE ocpx.center_id = ?)
        OR EXISTS (
          SELECT 1
          FROM operation_center_products ocp
          WHERE ocp.center_id = ? AND ocp.product_id = p.id AND ocp.is_enabled = 1
        )
      )`;
    centerParams = [centerId, centerId];
  }
  const [products] = await query(
    `SELECT p.id, p.name, p.base_price, p.category_id
     FROM products p
     WHERE p.is_active = 1 AND (? = 0 OR p.category_id = ?)
     ${centerFilter}
     ORDER BY p.name`,
    [categoryId || 0, categoryId || 0, ...centerParams]
  );

  const ids = products.map((p) => p.id);
  if (!ids.length) return res.json([]);

  const [groups] = await query(
    `SELECT pmg.product_id, g.id AS group_id, g.name, g.min_select, g.max_select, g.sort_order
     FROM product_modifier_groups pmg
     INNER JOIN modifier_groups g ON g.id = pmg.group_id
     WHERE pmg.product_id IN (${ids.map(() => "?").join(",")})
       AND g.is_active = 1
     ORDER BY pmg.product_id, g.sort_order, g.name`,
    ids
  );
  const groupIds = [...new Set(groups.map((g) => g.group_id))];

  let optionsByGroup = {};
  if (groupIds.length) {
    const [options] = await query(
      `SELECT id, group_id, name, price_delta
       FROM modifier_options
       WHERE group_id IN (${groupIds.map(() => "?").join(",")})
         AND is_active = 1
       ORDER BY sort_order, name`,
      groupIds
    );
    optionsByGroup = options.reduce((acc, op) => {
      acc[op.group_id] = acc[op.group_id] || [];
      acc[op.group_id].push(op);
      return acc;
    }, {});
  }

  const groupsByProduct = groups.reduce((acc, g) => {
    acc[g.product_id] = acc[g.product_id] || [];
    acc[g.product_id].push({
      groupId: g.group_id,
      name: g.name,
      minSelect: g.min_select,
      maxSelect: g.max_select,
      options: optionsByGroup[g.group_id] || [],
    });
    return acc;
  }, {});

  res.json(
    products.map((p) => ({
      ...p,
      modifiers: groupsByProduct[p.id] || [],
    }))
  );
});

app.get("/api/catalog/categories", async (req, res) => {
  const [rows] = await query(
    `SELECT id, name, color
     FROM product_categories
     WHERE is_active = 1
     ORDER BY sort_order, name`
  );
  res.json(rows);
});

app.get("/api/config/data", async (req, res) => {
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
    `SELECT id, name, printer_name, is_active
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
  res.json({ products, categories, areas, centers, tables, productionCenters, productProductionCenters, groups, options, productModifierGroups });
});

app.get("/api/accounts/:accountId", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const [accountRows] = await query(
    `SELECT a.id, a.check_number, a.guest_count, a.status, a.waiter_id, u.full_name AS waiter_name
     FROM accounts a
     INNER JOIN staff_users u ON u.id = a.waiter_id
     WHERE a.id = ?`,
    [accountId]
  );
  if (!accountRows.length) return res.status(404).json({ error: "Cuenta no encontrada" });

  const [items] = await query(
    `SELECT oi.id, oi.product_id, p.name AS product_name, oi.seat_no, oi.qty, oi.unit_price, oi.line_total, oi.notes, oi.sent_at
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.account_id = ? AND oi.status = 'active'
     ORDER BY oi.id DESC`,
    [accountId]
  );
  const itemIds = items.map((x) => x.id);
  let itemMods = {};
  if (itemIds.length) {
    const [mods] = await query(
      `SELECT oim.item_id, mo.name, oim.price_delta
       FROM order_item_modifiers oim
       INNER JOIN modifier_options mo ON mo.id = oim.option_id
       WHERE oim.item_id IN (${itemIds.map(() => "?").join(",")})`,
      itemIds
    );
    itemMods = mods.reduce((acc, m) => {
      acc[m.item_id] = acc[m.item_id] || [];
      acc[m.item_id].push({ name: m.name, priceDelta: Number(m.price_delta) });
      return acc;
    }, {});
  }
  const totals = await getAccountTotals(accountId);
  const enriched = items.map((i) => ({ ...i, modifiers: itemMods[i.id] || [] }));
  res.json({ account: accountRows[0], items: enriched, totals });
});

app.post("/api/accounts/:accountId/items", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const { productId, seatNo = 1, qty = 1, notes = "", modifierOptionIds = [] } = req.body || {};

  if (!productId) return res.status(400).json({ error: "productId es requerido" });
  const [prodRows] = await query(`SELECT id, base_price FROM products WHERE id = ? AND is_active = 1`, [productId]);
  if (!prodRows.length) return res.status(404).json({ error: "Producto no encontrado" });
  const basePrice = Number(prodRows[0].base_price);

  const normalizedOptionIds = (modifierOptionIds || []).map((x) => Number(x)).filter((x) => !Number.isNaN(x));
  const uniqueOptionIds = [...new Set(normalizedOptionIds)];

  const [requiredGroups] = await query(
    `SELECT g.id, g.name, g.min_select, g.max_select
     FROM product_modifier_groups pmg
     INNER JOIN modifier_groups g ON g.id = pmg.group_id
     WHERE pmg.product_id = ?
       AND g.is_active = 1`,
    [productId]
  );

  let selectedOptions = [];
  if (uniqueOptionIds.length) {
    const [rows] = await query(
      `SELECT mo.id, mo.group_id, mo.price_delta
       FROM modifier_options mo
       INNER JOIN product_modifier_groups pmg ON pmg.group_id = mo.group_id
       WHERE pmg.product_id = ?
         AND mo.is_active = 1
         AND mo.id IN (${uniqueOptionIds.map(() => "?").join(",")})`,
      [productId, ...uniqueOptionIds]
    );
    selectedOptions = rows;
    if (rows.length !== uniqueOptionIds.length) {
      return res.status(400).json({ error: "Hay opciones de modificador no permitidas para este platillo" });
    }
  }

  const selectedGroupCounts = {};
  const groupByOption = selectedOptions.reduce((acc, row) => {
    acc[Number(row.id)] = row;
    return acc;
  }, {});
  for (const optionId of normalizedOptionIds) {
    const option = groupByOption[Number(optionId)];
    if (!option) continue;
    const groupId = Number(option.group_id);
    selectedGroupCounts[groupId] = (selectedGroupCounts[groupId] || 0) + 1;
  }

  for (const group of requiredGroups) {
    const min = Math.max(0, Number(group.min_select || 0));
    const max = Math.max(0, Number(group.max_select || 0));
    const count = Number(selectedGroupCounts[Number(group.id)] || 0);
    if (count < min) {
      return res.status(400).json({ error: `Debes seleccionar al menos ${min} opcion(es) en ${group.name}` });
    }
    if (max > 0 && count > max) {
      return res.status(400).json({ error: `Solo puedes seleccionar ${max} opcion(es) en ${group.name}` });
    }
  }

  const priceByOptionId = selectedOptions.reduce((acc, row) => {
    acc[Number(row.id)] = Number(row.price_delta || 0);
    return acc;
  }, {});
  const modifierPrice = normalizedOptionIds.reduce((acc, optionId) => acc + Number(priceByOptionId[Number(optionId)] || 0), 0);

  const unitPrice = money(basePrice + modifierPrice);
  const lineTotal = money(unitPrice * Number(qty));
  const [result] = await query(
    `INSERT INTO order_items (account_id, product_id, seat_no, qty, unit_price, line_total, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [accountId, productId, seatNo, qty, unitPrice, lineTotal, notes, nowSql()]
  );
  if (normalizedOptionIds.length) {
    for (const optionId of normalizedOptionIds) {
      await query(
        `INSERT INTO order_item_modifiers (item_id, option_id, price_delta) VALUES (?, ?, ?)`,
        [result.insertId, optionId, Number(priceByOptionId[Number(optionId)] || 0)]
      );
    }
  }
  await addAccountEvent(accountId, "item_added", { itemId: result.insertId, seatNo }, null);
  res.status(201).json({ itemId: result.insertId });
});

app.post("/api/accounts/:accountId/discounts", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const { type, value, reason = "", createdBy } = req.body || {};
  if (!["percent", "fixed"].includes(type)) return res.status(400).json({ error: "type invalido" });
  if (!value || !createdBy) return res.status(400).json({ error: "value y createdBy son requeridos" });

  await query(
    `INSERT INTO account_discounts (account_id, type, value, reason, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [accountId, type, value, reason, createdBy, nowSql()]
  );
  await addAccountEvent(accountId, "discount_added", { type, value, reason }, createdBy);
  const totals = await getAccountTotals(accountId);
  res.status(201).json(totals);
});

async function deductInventoryForAccount(accountId) {
  try {
    const [items] = await query(
      `SELECT oi.product_id, oi.qty, p.track_inventory
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id = ? AND oi.status = 'active'`,
      [accountId]
    );
    for (const item of items) {
      if (!item.track_inventory) continue;
      const [recipe] = await query(
        `SELECT inventory_item_id, quantity FROM product_recipes WHERE product_id = ?`,
        [item.product_id]
      );
      for (const ingredient of recipe) {
        const deductQty = ingredient.quantity * item.qty;
        await query(
          `INSERT INTO stock_movements (inventory_item_id, type, quantity, reference_type, reference_id, created_at)
           VALUES (?, 'exit', ?, 'sale', ?, ?)`,
          [ingredient.inventory_item_id, deductQty, accountId, nowSql()]
        );
        await query(
          `UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?`,
          [deductQty, ingredient.inventory_item_id]
        );
      }
    }
  } catch (e) {
    console.error('Error deduciendo inventario:', e);
  }
}

app.post("/api/accounts/:accountId/payments", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const { method, amount, referenceNo = "" } = req.body || {};
  const normalizedMethod = normalizePaymentMethodCode(method);
  const amountNum = Number(amount || 0);
  if (!normalizedMethod || !amountNum || amountNum <= 0) {
    return res.status(400).json({ error: "method y amount (> 0) son requeridos" });
  }

  const [paymentMethodRows] = await query(
    `SELECT code
     FROM payment_methods
     WHERE code = ? AND is_active = 1
     LIMIT 1`,
    [normalizedMethod]
  );
  if (!paymentMethodRows.length) {
    return res.status(400).json({ error: "Forma de pago invalida o inactiva" });
  }

  await query(
    `INSERT INTO account_payments (account_id, method, amount, reference_no, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [accountId, normalizedMethod, amountNum, referenceNo, nowSql()]
  );
  await addAccountEvent(accountId, "payment_added", { method: normalizedMethod, amount: amountNum, referenceNo }, null);
  deductInventoryForAccount(accountId);

  const totals = await getAccountTotals(accountId);
  if (Number(totals.pending || 0) <= 0) {
    const [accountRows] = await query(`SELECT status FROM accounts WHERE id = ? LIMIT 1`, [accountId]);
    const status = String(accountRows?.[0]?.status || "");
    if (status === "open") {
      await query(`UPDATE accounts SET status = 'paid', closed_at = ? WHERE id = ?`, [nowSql(), accountId]);
      await addAccountEvent(accountId, "account_closed_auto", totals, null);
    }
  }
  res.status(201).json(totals);
});

app.post("/api/accounts/:accountId/close", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const totals = await getAccountTotals(accountId);
  if (totals.pending > 0) return res.status(400).json({ error: "La cuenta aun tiene saldo pendiente" });

  await query(`UPDATE accounts SET status = 'paid', closed_at = ? WHERE id = ?`, [nowSql(), accountId]);
  await addAccountEvent(accountId, "account_closed", totals, null);
  res.json({ ok: true });
});

app.delete("/api/accounts/:accountId", async (req, res) => {
  const accountId = Number(req.params.accountId || 0);
  if (!accountId) return res.status(400).json({ error: "accountId invalido" });

  const [accountRows] = await query(
    `SELECT id, status
     FROM accounts
     WHERE id = ?
     LIMIT 1`,
    [accountId]
  );
  if (!accountRows.length) return res.status(404).json({ error: "Cuenta no encontrada" });
  if (String(accountRows[0].status) !== "open") {
    return res.status(400).json({ error: "Solo puedes eliminar cuentas abiertas" });
  }

  const [[itemCountRow]] = await query(
    `SELECT COUNT(*) AS c
     FROM order_items
     WHERE account_id = ? AND status = 'active'`,
    [accountId]
  );
  const [[paymentCountRow]] = await query(
    `SELECT COUNT(*) AS c
     FROM account_payments
     WHERE account_id = ?`,
    [accountId]
  );
  const [[discountCountRow]] = await query(
    `SELECT COUNT(*) AS c
     FROM account_discounts
     WHERE account_id = ?`,
    [accountId]
  );
  const [[folioCountRow]] = await query(
    `SELECT COUNT(*) AS c
     FROM folio_charges
     WHERE account_id = ?`,
    [accountId]
  );

  const hasActivity =
    Number(itemCountRow?.c || 0) > 0 ||
    Number(paymentCountRow?.c || 0) > 0 ||
    Number(discountCountRow?.c || 0) > 0 ||
    Number(folioCountRow?.c || 0) > 0;
  if (hasActivity) {
    return res.status(400).json({ error: "Solo puedes eliminar cuentas vacias" });
  }

  await query(`DELETE FROM account_events WHERE account_id = ?`, [accountId]);
  await query(`DELETE FROM accounts WHERE id = ?`, [accountId]);
  res.json({ ok: true });
});

app.post("/api/accounts/:accountId/send", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const [rows] = await query(
    `SELECT id, check_number, status
     FROM accounts
     WHERE id = ?`,
    [accountId]
  );
  if (!rows.length) return res.status(404).json({ error: "Cuenta no encontrada" });
  if (rows[0].status !== "open") return res.status(400).json({ error: "Solo cuentas abiertas pueden enviarse" });

  const [items] = await query(
    `SELECT
      oi.id,
      oi.product_id,
      p.name AS product_name,
      oi.qty,
      oi.seat_no,
      oi.notes,
      oi.created_at,
      oi.line_total,
      pc.id AS center_id,
      COALESCE(pc.name, 'Restaurante') AS center_name,
      pc.printer_name
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
     LEFT JOIN production_centers pc ON pc.id = ppc.center_id
     WHERE oi.account_id = ? AND oi.status = 'active' AND oi.sent_at IS NULL
     ORDER BY center_name, oi.id`,
    [accountId]
  );
  if (!items.length) {
    return res.status(400).json({ error: "No hay productos nuevos por enviar en esta cuenta" });
  }

  const itemIds = [...new Set(items.map((x) => Number(x.id)))];
  let itemMods = {};
  if (itemIds.length) {
    const [mods] = await query(
      `SELECT oim.item_id, mo.name, oim.price_delta
       FROM order_item_modifiers oim
       INNER JOIN modifier_options mo ON mo.id = oim.option_id
       WHERE oim.item_id IN (${itemIds.map(() => "?").join(",")})
       ORDER BY oim.item_id, oim.id`,
      itemIds
    );
    itemMods = mods.reduce((acc, m) => {
      const key = Number(m.item_id);
      acc[key] = acc[key] || [];
      acc[key].push({ name: m.name, priceDelta: Number(m.price_delta || 0) });
      return acc;
    }, {});
  }

  const ticketsMap = new Map();
  for (const item of items) {
    const key = item.center_id ? `C-${item.center_id}` : "C-0";
    if (!ticketsMap.has(key)) {
      ticketsMap.set(key, {
        centerId: item.center_id ? Number(item.center_id) : null,
        centerName: item.center_name || "Restaurante",
        printerName: item.printer_name || "DEFAULT",
        items: [],
      });
    }
    ticketsMap.get(key).items.push({
      itemId: Number(item.id),
      productId: Number(item.product_id),
      productName: item.product_name,
      qty: Number(item.qty || 0),
      seatNo: Number(item.seat_no || 1),
      notes: item.notes || "",
      lineTotal: Number(item.line_total || 0),
      modifiers: itemMods[Number(item.id)] || [],
    });
  }
  const tickets = [...ticketsMap.values()];

  await query(
    `UPDATE order_items
     SET sent_at = ?
     WHERE account_id = ? AND status = 'active' AND sent_at IS NULL`,
    [nowSql(), accountId]
  );

  await addAccountEvent(
    accountId,
    "kitchen_ticket_sent",
    {
      checkNumber: rows[0].check_number,
      sentItems: items.length,
      destinations: tickets.map((t) => ({ centerName: t.centerName, printerName: t.printerName, count: t.items.length })),
    },
    null
  );

  res.json({ ok: true, checkNumber: rows[0].check_number, sentItems: items.length, tickets });
});

app.post("/api/accounts/:accountId/transfer-seat", async (req, res) => {
  const fromAccountId = Number(req.params.accountId);
  const { seatNo, toAccountId } = req.body || {};
  if (!seatNo || !toAccountId) return res.status(400).json({ error: "seatNo y toAccountId son requeridos" });

  await query(
    `UPDATE order_items SET account_id = ? WHERE account_id = ? AND seat_no = ? AND status = 'active'`,
    [toAccountId, fromAccountId, seatNo]
  );
  await addAccountEvent(fromAccountId, "seat_transferred_out", { seatNo, toAccountId }, null);
  await addAccountEvent(toAccountId, "seat_transferred_in", { seatNo, fromAccountId }, null);
  res.json({ ok: true });
});

app.post("/api/accounts/:accountId/move-item", async (req, res) => {
  const fromAccountId = Number(req.params.accountId);
  const { itemId, toAccountId, qty = null } = req.body || {};
  const parsedItemId = Number(itemId || 0);
  const parsedToAccountId = Number(toAccountId || 0);
  if (!fromAccountId || !parsedItemId || !parsedToAccountId) {
    return res.status(400).json({ error: "accountId, itemId y toAccountId son requeridos" });
  }

  const [fromRows] = await query(`SELECT id, table_id, status FROM accounts WHERE id = ? LIMIT 1`, [fromAccountId]);
  const [toRows] = await query(`SELECT id, table_id, status FROM accounts WHERE id = ? LIMIT 1`, [parsedToAccountId]);
  if (!fromRows.length || !toRows.length) return res.status(404).json({ error: "Cuenta origen o destino no encontrada" });
  if (Number(fromRows[0].table_id) !== Number(toRows[0].table_id)) {
    return res.status(400).json({ error: "Solo puedes mover entre cuentas de la misma mesa" });
  }
  if (String(fromRows[0].status) !== "open" || String(toRows[0].status) !== "open") {
    return res.status(400).json({ error: "Solo cuentas abiertas permiten mover productos" });
  }

  const [itemRows] = await query(
    `SELECT id, account_id, product_id, seat_no, qty, unit_price, line_total, notes, sent_at, created_at
     FROM order_items
     WHERE id = ? AND account_id = ? AND status = 'active'
     LIMIT 1`,
    [parsedItemId, fromAccountId]
  );
  if (!itemRows.length) return res.status(404).json({ error: "Platillo no encontrado en la cuenta origen" });
  const src = itemRows[0];
  const currentQty = Number(src.qty || 0);
  const moveQtyRaw = qty === null || qty === undefined || qty === "" ? currentQty : Number(qty);
  const moveQty = Number(moveQtyRaw.toFixed(2));
  if (Number.isNaN(moveQty) || moveQty <= 0 || moveQty > currentQty) {
    return res.status(400).json({ error: "Cantidad a mover invalida" });
  }

  const [mods] = await query(
    `SELECT option_id, price_delta
     FROM order_item_modifiers
     WHERE item_id = ?`,
    [parsedItemId]
  );

  if (moveQty >= currentQty - 0.0001) {
    await query(`UPDATE order_items SET account_id = ? WHERE id = ?`, [parsedToAccountId, parsedItemId]);
    await addAccountEvent(fromAccountId, "item_moved_out", { itemId: parsedItemId, toAccountId: parsedToAccountId, qty: moveQty }, null);
    await addAccountEvent(parsedToAccountId, "item_moved_in", { itemId: parsedItemId, fromAccountId, qty: moveQty }, null);
    return res.json({ ok: true, movedQty: moveQty, partial: false });
  }

  const remainingQty = Number((currentQty - moveQty).toFixed(2));
  await query(
    `UPDATE order_items
     SET qty = ?, line_total = ?
     WHERE id = ?`,
    [remainingQty, money(Number(src.unit_price) * remainingQty), parsedItemId]
  );
  const [inserted] = await query(
    `INSERT INTO order_items (account_id, product_id, seat_no, qty, unit_price, line_total, notes, sent_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsedToAccountId,
      Number(src.product_id),
      Number(src.seat_no || 1),
      moveQty,
      Number(src.unit_price),
      money(Number(src.unit_price) * moveQty),
      src.notes || "",
      src.sent_at || null,
      nowSql(),
    ]
  );
  const newItemId = Number(inserted.insertId);
  for (const mod of mods) {
    await query(
      `INSERT INTO order_item_modifiers (item_id, option_id, price_delta)
       VALUES (?, ?, ?)`,
      [newItemId, Number(mod.option_id), Number(mod.price_delta || 0)]
    );
  }
  await addAccountEvent(fromAccountId, "item_moved_out", { itemId: parsedItemId, toAccountId: parsedToAccountId, qty: moveQty }, null);
  await addAccountEvent(parsedToAccountId, "item_moved_in", { itemId: newItemId, fromAccountId, qty: moveQty }, null);
  res.json({ ok: true, movedQty: moveQty, partial: true, newItemId });
});

app.post("/api/accounts/:accountId/split-equal", async (req, res) => {
  const sourceAccountId = Number(req.params.accountId);
  const targetIdsRaw = Array.isArray(req.body?.targetAccountIds) ? req.body.targetAccountIds : [];
  if (!sourceAccountId || !targetIdsRaw.length) {
    return res.status(400).json({ error: "accountId y targetAccountIds son requeridos" });
  }
  const targetAccountIds = [...new Set(targetIdsRaw.map((x) => Number(x || 0)).filter((x) => x > 0))];
  if (!targetAccountIds.includes(sourceAccountId)) targetAccountIds.unshift(sourceAccountId);
  if (targetAccountIds.length < 2) {
    return res.status(400).json({ error: "Se requieren al menos 2 cuentas para compartir" });
  }

  const [sourceRows] = await query(`SELECT id, table_id, status FROM accounts WHERE id = ? LIMIT 1`, [sourceAccountId]);
  if (!sourceRows.length) return res.status(404).json({ error: "Cuenta origen no encontrada" });
  if (String(sourceRows[0].status) !== "open") return res.status(400).json({ error: "Cuenta origen no esta abierta" });
  const tableId = Number(sourceRows[0].table_id);

  const [targetRows] = await query(
    `SELECT id, table_id, status
     FROM accounts
     WHERE id IN (${targetAccountIds.map(() => "?").join(",")})`,
    targetAccountIds
  );
  if (targetRows.length !== targetAccountIds.length) {
    return res.status(400).json({ error: "Una o mas cuentas destino no existen" });
  }
  const invalidTarget = targetRows.find((r) => Number(r.table_id) !== tableId || String(r.status) !== "open");
  if (invalidTarget) {
    return res.status(400).json({ error: "Todas las cuentas destino deben ser abiertas y de la misma mesa" });
  }

  const [items] = await query(
    `SELECT id, product_id, seat_no, qty, unit_price, notes, sent_at
     FROM order_items
     WHERE account_id = ? AND status = 'active'`,
    [sourceAccountId]
  );
  if (!items.length) return res.status(400).json({ error: "No hay platillos activos para compartir" });

  for (const item of items) {
    const totalQty = Number(item.qty || 0);
    if (totalQty <= 0) continue;
    const n = targetAccountIds.length;
    const perQty = Number((totalQty / n).toFixed(2));
    let consumed = 0;

    for (let idx = 0; idx < n; idx += 1) {
      const targetId = targetAccountIds[idx];
      let splitQty = idx === n - 1 ? Number((totalQty - consumed).toFixed(2)) : perQty;
      splitQty = Number(splitQty.toFixed(2));
      if (splitQty <= 0) continue;
      consumed = Number((consumed + splitQty).toFixed(2));

      if (targetId === sourceAccountId) {
        await query(
          `UPDATE order_items
           SET qty = ?, line_total = ?
           WHERE id = ?`,
          [splitQty, money(Number(item.unit_price) * splitQty), Number(item.id)]
        );
      } else {
        const [inserted] = await query(
          `INSERT INTO order_items (account_id, product_id, seat_no, qty, unit_price, line_total, notes, sent_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            targetId,
            Number(item.product_id),
            Number(item.seat_no || 1),
            splitQty,
            Number(item.unit_price),
            money(Number(item.unit_price) * splitQty),
            item.notes || "",
            item.sent_at || null,
            nowSql(),
          ]
        );
        const newItemId = Number(inserted.insertId);
        const [mods] = await query(
          `SELECT option_id, price_delta
           FROM order_item_modifiers
           WHERE item_id = ?`,
          [Number(item.id)]
        );
        for (const mod of mods) {
          await query(
            `INSERT INTO order_item_modifiers (item_id, option_id, price_delta)
             VALUES (?, ?, ?)`,
            [newItemId, Number(mod.option_id), Number(mod.price_delta || 0)]
          );
        }
      }
    }
  }

  await addAccountEvent(sourceAccountId, "items_shared_equal", { targetAccountIds }, null);
  res.json({ ok: true, targets: targetAccountIds.length });
});

// Split personalizado - crear N cuentas y asignar items específicos a cada una
app.post("/api/accounts/:accountId/split-custom", async (req, res) => {
  const sourceAccountId = Number(req.params.accountId);
  const { splits } = req.body || {};

  if (!sourceAccountId || !Array.isArray(splits) || splits.length < 2) {
    return res.status(400).json({ error: "Se requieren al menos 2 cuentas para dividir" });
  }

  const [srcRows] = await query(
    `SELECT id, table_id, waiter_id, operation_center_id, guest_count, status
     FROM accounts WHERE id = ? LIMIT 1`,
    [sourceAccountId]
  );
  if (!srcRows.length) return res.status(404).json({ error: "Cuenta origen no encontrada" });
  if (String(srcRows[0].status) !== "open") return res.status(400).json({ error: "Cuenta origen no está abierta" });

  const { table_id, waiter_id, operation_center_id } = srcRows[0];

  const allItemIds = splits.flatMap(s => (s.itemIds || []).map(id => Number(id)));
  if (allItemIds.length === 0) {
    return res.status(400).json({ error: "Debes asignar al menos un producto a las cuentas" });
  }

  const placeholders = allItemIds.map(() => '?').join(',');
  const [validItems] = await query(
    `SELECT id FROM order_items WHERE id IN (${placeholders}) AND account_id = ? AND status = 'active'`,
    [...allItemIds, sourceAccountId]
  );
  if (validItems.length !== allItemIds.length) {
    return res.status(400).json({ error: "Uno o más productos no son válidos o ya fueron movidos" });
  }

  const [openShift] = await query(
    `SELECT id FROM shifts WHERE status = 'open' AND operation_center_id = ? ORDER BY id DESC LIMIT 1`,
    [operation_center_id]
  );
  const shiftId = openShift.length ? openShift[0].id : null;

  const results = [];

  for (const split of splits) {
    const itemIds = (split.itemIds || []).map(id => Number(id));
    if (itemIds.length === 0) continue;

    const tempCheckNumber = `TMP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const [result] = await query(
      `INSERT INTO accounts (table_id, operation_center_id, waiter_id, shift_id, status, guest_count, check_number, opened_at)
       VALUES (?, ?, ?, ?, 'open', 1, ?, ?)`,
      [table_id, operation_center_id, waiter_id, shiftId, tempCheckNumber, nowSql()]
    );
    const newAccountId = Number(result.insertId);
    const checkNumber = `CHK-${String(newAccountId).padStart(4, "0")}`;
    await query(`UPDATE accounts SET check_number = ? WHERE id = ?`, [checkNumber, newAccountId]);

    if (itemIds.length > 0) {
      const itemPlaceholders = itemIds.map(() => '?').join(',');
      await query(
        `UPDATE order_items SET account_id = ? WHERE id IN (${itemPlaceholders})`,
        [newAccountId, ...itemIds]
      );
    }

    await addAccountEvent(newAccountId, "account_opened", { source: sourceAccountId, split: true }, waiter_id);
    await addAccountEvent(sourceAccountId, "items_split_out", { toAccountId: newAccountId, count: itemIds.length }, null);

    results.push({ accountId: newAccountId, checkNumber, name: split.name || `Cuenta ${results.length + 1}`, itemIds });
  }

  res.json({ ok: true, splits: results });
});

// Transferir cuenta a otra cuenta (puede ser otro centro)
app.post("/api/accounts/:accountId/transfer-account", async (req, res) => {
  const sourceAccountId = Number(req.params.accountId);
  const { targetAccountId } = req.body || {};
  if (!sourceAccountId || !targetAccountId) {
    return res.status(400).json({ error: "sourceAccountId y targetAccountId son requeridos" });
  }

  const [sourceRows] = await query(`SELECT id, status FROM accounts WHERE id = ? LIMIT 1`, [sourceAccountId]);
  if (!sourceRows.length) return res.status(404).json({ error: "Cuenta origen no encontrada" });
  if (String(sourceRows[0].status) !== "open") {
    return res.status(400).json({ error: "Solo cuentas abiertas pueden transferirse" });
  }

  const [targetRows] = await query(`SELECT id, status FROM accounts WHERE id = ? LIMIT 1`, [targetAccountId]);
  if (!targetRows.length) return res.status(404).json({ error: "Cuenta destino no encontrada" });
  if (String(targetRows[0].status) !== "open") {
    return res.status(400).json({ error: "La cuenta destino debe estar abierta" });
  }
  if (sourceAccountId === targetAccountId) {
    return res.status(400).json({ error: "No puedes transferir a la misma cuenta" });
  }

  const [items] = await query(
    `SELECT id, seat_no FROM order_items WHERE account_id = ? AND status = 'active'`,
    [sourceAccountId]
  );

  for (const item of items) {
    await query(
      `UPDATE order_items SET account_id = ? WHERE id = ? AND status = 'active'`,
      [targetAccountId, item.id]
    );
  }

  await query(`UPDATE accounts SET status = 'void' WHERE id = ?`, [sourceAccountId]);
  await addAccountEvent(sourceAccountId, "transferred_to", { targetAccountId }, null);
  await addAccountEvent(targetAccountId, "received_transfer_from", { sourceAccountId }, null);
  res.json({ ok: true, transferredItems: items.length });
});

// Unir cuentas (combinar items de dos cuentas)
app.post("/api/accounts/:accountId/join-with", async (req, res) => {
  const targetAccountId = Number(req.params.accountId);
  const { sourceAccountId } = req.body || {};
  if (!targetAccountId || !sourceAccountId) {
    return res.status(400).json({ error: "targetAccountId y sourceAccountId son requeridos" });
  }
  if (targetAccountId === sourceAccountId) {
    return res.status(400).json({ error: "No puedes unir una cuenta consigo misma" });
  }

  const [targetRows] = await query(`SELECT id, status FROM accounts WHERE id = ? LIMIT 1`, [targetAccountId]);
  if (!targetRows.length) return res.status(404).json({ error: "Cuenta destino no encontrada" });
  if (String(targetRows[0].status) !== "open") {
    return res.status(400).json({ error: "La cuenta destino debe estar abierta" });
  }

  const [sourceRows] = await query(`SELECT id, status FROM accounts WHERE id = ? LIMIT 1`, [sourceAccountId]);
  if (!sourceRows.length) return res.status(404).json({ error: "Cuenta origen no encontrada" });
  if (String(sourceRows[0].status) !== "open") {
    return res.status(400).json({ error: "La cuenta origen debe estar abierta" });
  }

  const [items] = await query(
    `SELECT id, seat_no FROM order_items WHERE account_id = ? AND status = 'active'`,
    [sourceAccountId]
  );

  for (const item of items) {
    await query(
      `UPDATE order_items SET account_id = ? WHERE id = ? AND status = 'active'`,
      [targetAccountId, item.id]
    );
  }

  await query(`UPDATE accounts SET status = 'void' WHERE id = ?`, [sourceAccountId]);
  await addAccountEvent(sourceAccountId, "joined_with", { targetAccountId }, null);
  await addAccountEvent(targetAccountId, "joined_with", { sourceAccountId }, null);
  res.json({ ok: true, joinedItems: items.length });
});

app.post("/api/items/:itemId/move-seat", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const { newSeatNo } = req.body || {};
  if (!newSeatNo) return res.status(400).json({ error: "newSeatNo es requerido" });
  await query(`UPDATE order_items SET seat_no = ? WHERE id = ? AND status = 'active'`, [newSeatNo, itemId]);
  res.json({ ok: true });
});

app.post("/api/items/:itemId/qty", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const { qty } = req.body || {};
  const nextQty = Number(qty);
  if (!itemId || Number.isNaN(nextQty) || nextQty <= 0) {
    return res.status(400).json({ error: "itemId y qty (> 0) son requeridos" });
  }

  const [rows] = await query(
    `SELECT id, account_id, unit_price, sent_at
     FROM order_items
     WHERE id = ? AND status = 'active'`,
    [itemId]
  );
  if (!rows.length) return res.status(404).json({ error: "Item no encontrado" });
  if (rows[0].sent_at) {
    return res.status(400).json({ error: "No puedes cambiar cantidad de un platillo ya enviado" });
  }

  const accountId = Number(rows[0].account_id);
  const unitPrice = Number(rows[0].unit_price);
  const lineTotal = money(unitPrice * nextQty);

  await query(
    `UPDATE order_items
     SET qty = ?, line_total = ?
     WHERE id = ? AND status = 'active'`,
    [nextQty, lineTotal, itemId]
  );
  await addAccountEvent(accountId, "item_qty_updated", { itemId, qty: nextQty }, null);
  res.json({ ok: true });
});

app.post("/api/items/:itemId/void", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const { reason = "", authorizedBy, authPin = "" } = req.body || {};

  const [rows] = await query(
    `SELECT
      oi.account_id,
      oi.sent_at,
      oi.status,
      oi.qty,
      oi.seat_no,
      oi.notes,
      p.id AS product_id,
      p.name AS product_name,
      a.check_number,
      rt.code AS table_code,
      waiter.id AS waiter_id,
      waiter.full_name AS waiter_name,
      pc.id AS center_id,
      COALESCE(pc.name, 'Restaurante') AS center_name,
      COALESCE(pc.printer_name, 'DEFAULT') AS printer_name
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN restaurant_tables rt ON rt.id = a.table_id
     INNER JOIN staff_users waiter ON waiter.id = a.waiter_id
     LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
     LEFT JOIN production_centers pc ON pc.id = ppc.center_id
     WHERE oi.id = ?`,
    [itemId]
  );
  if (!rows.length) return res.status(404).json({ error: "Item no encontrado" });
  if (rows[0].status !== "active") return res.status(400).json({ error: "El item ya no esta activo" });
  const accountId = rows[0].account_id;
  const isSent = Boolean(rows[0].sent_at);

  let finalAuthorizedBy = Number(authorizedBy || 0) || null;
  let authorizerUser = null;
  if (isSent) {
    const pin = String(authPin || "").trim();
    if (!pin) return res.status(400).json({ error: "PIN de autorizacion requerido para revertir un platillo enviado" });
    const [authRows] = await query(
      `SELECT id, full_name, role
       FROM staff_users
       WHERE pin_code = ? AND role IN ('manager', 'admin')
       LIMIT 1`,
      [pin]
    );
    if (!authRows.length) return res.status(403).json({ error: "PIN invalido o sin permisos para revertir" });
    finalAuthorizedBy = Number(authRows[0].id);
    authorizerUser = authRows[0];
  } else if (!finalAuthorizedBy) {
    return res.status(400).json({ error: "authorizedBy es requerido" });
  }

  await query(
    `UPDATE order_items
     SET status = 'void', void_reason = ?, void_authorized_by = ?, voided_at = ?
     WHERE id = ? AND status = 'active'`,
    [reason, finalAuthorizedBy, nowSql(), itemId]
  );
  const reversedAt = nowSql();

  let reversalTicket = null;
  if (isSent) {
    const requesterUserId = Number(authorizedBy || 0) || Number(rows[0].waiter_id || 0);
    let requesterName = rows[0].waiter_name || "Mesero";
    if (requesterUserId) {
      const [requesterRows] = await query(`SELECT full_name FROM staff_users WHERE id = ? LIMIT 1`, [requesterUserId]);
      if (requesterRows.length) requesterName = requesterRows[0].full_name;
    }

    reversalTicket = {
      header: "REVERSIÓN DE COMANDA",
      ticketType: "reversal",
      accountId,
      checkNumber: rows[0].check_number,
      tableCode: rows[0].table_code,
      centerId: rows[0].center_id ? Number(rows[0].center_id) : null,
      centerName: rows[0].center_name,
      printerName: rows[0].printer_name,
      reversedAt,
      requestedBy: {
        userId: requesterUserId || null,
        fullName: requesterName,
        role: "waiter",
      },
      authorizedBy: {
        userId: finalAuthorizedBy,
        fullName: authorizerUser?.full_name || "Autorizado",
        role: authorizerUser?.role || "manager",
      },
      item: {
        itemId,
        productId: Number(rows[0].product_id),
        productName: rows[0].product_name,
        seatNo: Number(rows[0].seat_no || 1),
        qtyReverted: Number(rows[0].qty || 0),
        notes: rows[0].notes || "",
        reason,
      },
    };

    await addAccountEvent(accountId, "reversal_ticket_sent", reversalTicket, finalAuthorizedBy);
  }

  await addAccountEvent(accountId, "item_voided", { itemId, reason, isSent, reversedAt }, finalAuthorizedBy);
  res.json({ ok: true, reversalTicket });
});

// =============================================
// CXC - Cuentas por Cobrar
// =============================================

// Áreas CXC
app.get("/api/cxc/areas", async (_req, res) => {
  try {
    const [rows] = await query(`SELECT id, name, is_active, created_at FROM cxc_areas WHERE is_active = 1 ORDER BY name`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/cxc/areas", async (req, res) => {
  try {
    const { name, is_active = 1 } = req.body || {};
    if (!name) return res.status(400).json({ error: "Nombre requerido" });
    const [result] = await query(`INSERT INTO cxc_areas (name, is_active) VALUES (?, ?)`, [name, is_active]);
    res.json({ ok: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/cxc/areas/:areaId", async (req, res) => {
  try {
    const { areaId } = req.params;
    const { name, is_active } = req.body || {};
    await query(`UPDATE cxc_areas SET name = COALESCE(?, name), is_active = COALESCE(?, is_active) WHERE id = ?`, [name, is_active, areaId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/cxc/areas/:areaId", async (req, res) => {
  try {
    const { areaId } = req.params;
    await query(`UPDATE cxc_areas SET is_active = 0 WHERE id = ?`, [areaId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Clientes CXC
app.get("/api/cxc/clients", async (_req, res) => {
  try {
    const [rows] = await query(`
      SELECT c.*, ca.name as area_name
      FROM customers c
      LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
      WHERE c.cxc_enabled = 1 AND c.is_active = 1
      ORDER BY c.full_name
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/cxc/clients", async (req, res) => {
  try {
    const { full_name, phone, credit_limit = 0, cxc_area_id, default_discount_percent = 0, is_active = 1 } = req.body || {};
    if (!full_name) return res.status(400).json({ error: "Nombre requerido" });
    const [result] = await query(
      `INSERT INTO customers (full_name, phone, cxc_enabled, credit_limit, cxc_area_id, default_discount_percent, is_active) VALUES (?, ?, 1, ?, ?, ?, ?)`,
      [full_name, phone, credit_limit, cxc_area_id, default_discount_percent, is_active]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/cxc/clients/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { full_name, phone, credit_limit, cxc_area_id, default_discount_percent, is_active } = req.body || {};
    await query(
      `UPDATE customers SET 
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        credit_limit = COALESCE(?, credit_limit),
        cxc_area_id = COALESCE(?, cxc_area_id),
        default_discount_percent = COALESCE(?, default_discount_percent),
        is_active = COALESCE(?, is_active)
      WHERE id = ? AND cxc_enabled = 1`,
      [full_name, phone, credit_limit, cxc_area_id, default_discount_percent, is_active, clientId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Categorías permitidas por cliente
app.get("/api/cxc/clients/:clientId/categories", async (req, res) => {
  try {
    const { clientId } = req.params;
    const [rows] = await query(`
      SELECT cc.id, cc.category_id, pc.name as category_name, cc.allow_discount
      FROM cxc_client_categories cc
      JOIN product_categories pc ON cc.category_id = pc.id
      WHERE cc.client_id = ?
    `, [clientId]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/cxc/clients/:clientId/categories", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { category_id, allow_discount = 1 } = req.body || {};
    if (!category_id) return res.status(400).json({ error: "Categoría requerida" });
    await query(
      `INSERT INTO cxc_client_categories (client_id, category_id, allow_discount) VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE allow_discount = VALUES(allow_discount)`,
      [clientId, category_id, allow_discount]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/cxc/clients/:clientId/categories/:categoryId", async (req, res) => {
  try {
    const { clientId, categoryId } = req.params;
    await query(`DELETE FROM cxc_client_categories WHERE client_id = ? AND category_id = ?`, [clientId, categoryId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Obtener todas las categorías con opción de是否能 aplicar descuento a cliente específico
app.get("/api/cxc/categories", async (req, res) => {
  try {
    const clientId = req.query.client_id;
    let sql = `SELECT id, name, discount_blocked, sort_order FROM product_categories ORDER BY sort_order`;
    const [rows] = await query(sql);
    if (clientId) {
      const [allowed] = await query(`SELECT category_id, allow_discount FROM cxc_client_categories WHERE client_id = ?`, [clientId]);
      const allowedMap = new Map(allowed.map(a => [a.category_id, a.allow_discount]));
      rows.forEach(r => {
        r.client_can_discount = allowedMap.has(r.id) ? allowedMap.get(r.id) : 0;
      });
    }
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear cuenta CXC (al pagar con CXC)
app.post("/api/cxc/accounts", async (req, res) => {
  try {
    const { client_id, account_id, shift_id, amount, reference = "", notes = "" } = req.body || {};
    if (!client_id || !amount) return res.status(400).json({ error: "client_id y amount requeridos" });

    const [client] = await query(`SELECT credit_limit, current_balance FROM customers WHERE id = ? AND cxc_enabled = 1`, [client_id]);
    if (!client.length) return res.status(400).json({ error: "Cliente CXC no encontrado" });

    const newBalance = Number(client[0].current_balance) + Number(amount);
    if (newBalance > Number(client[0].credit_limit)) {
      return res.status(400).json({ error: "Excede el límite de crédito", available: Number(client[0].credit_limit) - Number(client[0].current_balance) });
    }

    const [result] = await query(
      `INSERT INTO cxc_accounts (client_id, account_id, shift_id, amount, balance, reference, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [client_id, account_id, shift_id, amount, newBalance, reference, notes]
    );

    await query(`UPDATE customers SET current_balance = ? WHERE id = ?`, [newBalance, client_id]);

    res.json({ ok: true, id: result.insertId, new_balance: newBalance });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Pagos a cuenta CXC
app.post("/api/cxc/accounts/:cxcAccountId/payments", async (req, res) => {
  try {
    const { cxcAccountId } = req.params;
    const { amount, payment_method, reference = "", notes = "" } = req.body || {};
    if (!amount) return res.status(400).json({ error: "Monto requerido" });

    const [cxc] = await query(`SELECT client_id, balance, status FROM cxc_accounts WHERE id = ?`, [cxcAccountId]);
    if (!cxc.length) return res.status(400).json({ error: "Cuenta CXC no encontrada" });

    const newBalance = Number(cxc[0].balance) - Number(amount);
    const newStatus = newBalance <= 0 ? 'paid' : newBalance < Number(cxc[0].balance) ? 'partial' : 'pending';

    await query(
      `INSERT INTO cxc_payments (cxc_account_id, amount, payment_method, reference, notes) VALUES (?, ?, ?, ?, ?)`,
      [cxcAccountId, amount, payment_method, reference, notes]
    );

    await query(`UPDATE cxc_accounts SET balance = ?, status = ?, paid_at = ? WHERE id = ?`, 
      [newBalance > 0 ? newBalance : 0, newStatus, newBalance <= 0 ? nowSql() : null, cxcAccountId]);

    await query(`UPDATE customers SET current_balance = current_balance - ? WHERE id = ?`, [amount, cxc[0].client_id]);

    res.json({ ok: true, new_balance: newBalance, status: newStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Historial de cuenta CXC
app.get("/api/cxc/accounts/:cxcAccountId", async (req, res) => {
  try {
    const { cxcAccountId } = req.params;
    const [cxc] = await query(`
      SELECT cxa.*, c.full_name as client_name, c.credit_limit, c.current_balance,
             u.full_name as waiter_name
      FROM cxc_accounts cxa
      JOIN customers c ON cxa.client_id = c.id
      LEFT JOIN accounts a ON cxa.account_id = a.id
      LEFT JOIN staff_users u ON a.waiter_id = u.id
      WHERE cxa.id = ?
    `, [cxcAccountId]);
    if (!cxc.length) return res.status(404).json({ error: "No encontrada" });

    const [payments] = await query(`SELECT * FROM cxc_payments WHERE cxc_account_id = ? ORDER BY created_at DESC`, [cxcAccountId]);

    let items = [];
    if (cxc[0].account_id) {
      const [orderItems] = await query(`
        SELECT oi.id, oi.product_id, p.name as product_name, oi.qty, oi.unit_price, oi.line_total, oi.notes, oi.seat_no
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.account_id = ? AND oi.status = 'active'
        ORDER BY oi.created_at
      `, [cxc[0].account_id]);
      items = orderItems;
    }

    res.json({ ...cxc[0], payments, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Todas las cuentas CXC de un cliente
app.get("/api/cxc/clients/:clientId/accounts", async (req, res) => {
  try {
    const { clientId } = req.params;
    const [rows] = await query(`
      SELECT cxa.*, a.check_number, u.full_name as waiter_name
      FROM cxc_accounts cxa
      LEFT JOIN accounts a ON cxa.account_id = a.id
      LEFT JOIN staff_users u ON a.waiter_id = u.id
      WHERE cxa.client_id = ?
      ORDER BY cxa.created_at DESC
    `, [clientId]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CXC por cobrar (resumen)
app.get("/api/cxc/pending", async (_req, res) => {
  try {
    const [rows] = await query(`
      SELECT c.id as client_id, c.full_name, c.credit_limit, c.current_balance,
        (c.credit_limit - c.current_balance) as available_credit,
        COUNT(cxa.id) as pending_accounts,
        SUM(cxa.balance) as total_pending
      FROM customers c
      JOIN cxc_accounts cxa ON c.id = cxa.client_id AND cxa.status IN ('pending', 'partial')
      WHERE c.cxc_enabled = 1 AND c.is_active = 1
      GROUP BY c.id
      ORDER BY c.full_name
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Aplicar descuento CXC a un producto
app.get("/api/cxc/check-discount", async (req, res) => {
  try {
    const clientId = req.query.client_id;
    const productId = req.query.product_id;
    if (!clientId || !productId) return res.status(400).json({ error: "client_id y product_id requeridos" });

    const [client] = await query(`SELECT default_discount_percent, cxc_enabled FROM customers WHERE id = ?`, [clientId]);
    if (!client.length || !client[0].cxc_enabled) return res.json({ allowed: false, discount: 0 });

    const [product] = await query(`SELECT category_id, allow_discount FROM products WHERE id = ?`, [productId]);
    if (!product.length || !product[0].allow_discount) return res.json({ allowed: false, discount: 0, reason: "Producto no permite descuento" });

    const [category] = await query(`SELECT discount_blocked FROM product_categories WHERE id = ?`, [product[0].category_id]);
    if (category.length && category[0].discount_blocked) return res.json({ allowed: false, discount: 0, reason: "Categoría no permite descuento" });

    const [clientCat] = await query(`SELECT allow_discount FROM cxc_client_categories WHERE client_id = ? AND category_id = ?`, [clientId, product[0].category_id]);
    if (clientCat.length && !clientCat[0].allow_discount) return res.json({ allowed: false, discount: 0, reason: "Cliente tiene descuento bloqueado para esta categoría" });

    res.json({ allowed: true, discount: client[0].default_discount_percent || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Pago global CXC - distribuir pago entre todas las cuentas pendientes (FIFO)
app.post("/api/cxc/clients/:clientId/pay-global", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const { amount, payment_method = "efectivo", reference = "", notes = "" } = req.body || {};
    if (!clientId || !amount || amount <= 0) return res.status(400).json({ error: "clientId y monto requeridos" });

    const [client] = await query(`SELECT full_name, current_balance FROM customers WHERE id = ? AND cxc_enabled = 1`, [clientId]);
    if (!client.length) return res.status(400).json({ error: "Cliente no encontrado" });

    const [accounts] = await query(
      `SELECT id, balance, amount FROM cxc_accounts WHERE client_id = ? AND status IN ('pending', 'partial') ORDER BY created_at ASC`,
      [clientId]
    );
    if (!accounts.length) return res.status(400).json({ error: "No hay cuentas pendientes" });

    let remaining = Number(amount);
    const appliedPayments = [];
    const paidAccountIds = [];
    const partialAccountIds = [];

    for (const acc of accounts) {
      if (remaining <= 0) break;

      const accBalance = Number(acc.balance);
      const payAmount = Math.min(remaining, accBalance);
      const newBalance = accBalance - payAmount;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      await query(
        `INSERT INTO cxc_payments (cxc_account_id, amount, payment_method, reference, notes) VALUES (?, ?, ?, ?, ?)`,
        [acc.id, payAmount, payment_method, reference, notes]
      );

      await query(
        `UPDATE cxc_accounts SET balance = ?, status = ?, paid_at = ? WHERE id = ?`,
        [newBalance, newStatus, newBalance <= 0 ? nowSql() : null, acc.id]
      );

      if (newStatus === 'paid') paidAccountIds.push(acc.id);
      else partialAccountIds.push(acc.id);

      appliedPayments.push({ account_id: acc.id, amount: payAmount, new_balance: newBalance, status: newStatus });
      remaining = Number((remaining - payAmount).toFixed(2));
    }

    // Update customer total balance
    const totalPaid = Number((Number(amount) - remaining).toFixed(2));
    await query(`UPDATE customers SET current_balance = current_balance - ? WHERE id = ?`, [totalPaid, clientId]);

    res.json({
      ok: true,
      total_paid: totalPaid,
      remaining,
      applied_payments: appliedPayments,
      paid_accounts: paidAccountIds,
      partial_accounts: partialAccountIds,
      client_balance: Number(client[0].current_balance) - totalPaid
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Estado de cuenta CXC - reporte completo con movimientos
app.get("/api/cxc/clients/:clientId/statement", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const centerId = req.query.center_id ? Number(req.query.center_id) : null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const checkNumber = req.query.check_number || null;

    const [client] = await query(
      `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, c.cxc_enabled, c.is_active, c.created_at, ca.name as area_name
       FROM customers c LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id WHERE c.id = ?`,
      [clientId]
    );
    if (!client.length) return res.status(404).json({ error: "Cliente no encontrado" });

    let centers = [];

    // We try the full query with center info first
    let accounts = [];
    let payments = [];
    let hasCenterInfo = false;

    try {
      const [centerRows] = await query(
        `SELECT DISTINCT oc.id, oc.name
         FROM cxc_accounts cxa
         INNER JOIN accounts a ON cxa.account_id = a.id
         INNER JOIN restaurant_tables t ON t.id = a.table_id
         INNER JOIN operation_centers oc ON oc.id = t.operation_center_id
         WHERE cxa.client_id = ?
         ORDER BY oc.name`,
        [clientId]
      );
      centers = centerRows;

      // If we got here, the tables exist — do full query
      const accParams = [clientId];
      let accWhere = `cxa.client_id = ?`;
      if (centerId) { accWhere += ` AND t.operation_center_id = ?`; accParams.push(centerId); }
      if (startDate) { accWhere += ` AND cxa.created_at >= ?`; accParams.push(startDate); }
      if (endDate) { accWhere += ` AND cxa.created_at <= ?`; accParams.push(`${endDate} 23:59:59`); }
      if (checkNumber) { accWhere += ` AND a.check_number LIKE ?`; accParams.push(`%${checkNumber}%`); }

      const [accRows] = await query(
        `SELECT cxa.id, cxa.amount, cxa.balance, cxa.status, cxa.created_at, cxa.reference, cxa.notes,
                a.check_number, u.full_name as waiter_name, oc.name as center_name
         FROM cxc_accounts cxa
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN staff_users u ON a.waiter_id = u.id
         LEFT JOIN restaurant_tables t ON t.id = a.table_id
         LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
         WHERE ${accWhere}
         ORDER BY cxa.created_at ASC`,
        accParams
      );
      accounts = accRows;
      hasCenterInfo = true;
    } catch (e) { console.error('Statement center/accounts query error:', e.message); }

    if (!hasCenterInfo) {
      const accParams = [clientId];
      let accWhere = `cxa.client_id = ?`;
      if (startDate) { accWhere += ` AND cxa.created_at >= ?`; accParams.push(startDate); }
      if (endDate) { accWhere += ` AND cxa.created_at <= ?`; accParams.push(`${endDate} 23:59:59`); }
      if (checkNumber) { accWhere += ` AND a.check_number LIKE ?`; accParams.push(`%${checkNumber}%`); }

      const [accRows] = await query(
        `SELECT cxa.id, cxa.amount, cxa.balance, cxa.status, cxa.created_at, cxa.reference, cxa.notes,
                a.check_number, u.full_name as waiter_name, NULL as center_name
         FROM cxc_accounts cxa
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN staff_users u ON a.waiter_id = u.id
         WHERE ${accWhere}
         ORDER BY cxa.created_at ASC`,
        accParams
      );
      accounts = accRows;
    }

    const accountIds = accounts.map(a => a.id);
    if (accountIds.length > 0) {
      const payParams = [...accountIds];
      let payWhere = `cp.cxc_account_id IN (${accountIds.map(() => '?').join(',')})`;
      if (startDate) { payWhere += ` AND cp.created_at >= ?`; payParams.push(startDate); }
      if (endDate) { payWhere += ` AND cp.created_at <= ?`; payParams.push(`${endDate} 23:59:59`); }
      const [payRows] = await query(
        `SELECT cp.*, cxa.account_id FROM cxc_payments cp JOIN cxc_accounts cxa ON cp.cxc_account_id = cxa.id WHERE ${payWhere} ORDER BY cp.created_at ASC`,
        payParams
      );
      payments = payRows;
    }

    // Build movements array
    const movements = [];
    let runningBalance = 0;

    movements.push({
      date: client[0].created_at,
      type: 'initial',
      description: 'Saldo inicial',
      charge: 0,
      payment: 0,
      balance: 0,
      center_name: null
    });

    for (const acc of accounts) {
      runningBalance = Number((runningBalance + Number(acc.amount)).toFixed(2));
      movements.push({
        date: acc.created_at,
        type: 'charge',
        description: `Cargo - ${acc.check_number || `#${acc.id}`}${acc.waiter_name ? ` (${acc.waiter_name})` : ''}`,
        charge: Number(acc.amount),
        payment: 0,
        balance: runningBalance,
        center_name: acc.center_name || null
      });
    }

    for (const pay of payments) {
      runningBalance = Number((runningBalance - Number(pay.amount)).toFixed(2));
      const acc = accounts.find(a => a.id === pay.account_id);
      movements.push({
        date: pay.created_at,
        type: 'payment',
        description: `Pago - ${pay.payment_method}${pay.reference ? ` (Ref: ${pay.reference})` : ''}${acc ? ` - ${acc.check_number || `#${acc.id}`}` : ''}`,
        charge: 0,
        payment: Number(pay.amount),
        balance: runningBalance,
        center_name: acc?.center_name || null
      });
    }

    res.json({
      client: client[0],
      accounts,
      payments,
      movements,
      centers,
      totals: {
        total_charged: accounts.reduce((s, a) => s + Number(a.amount), 0),
        total_paid: payments.reduce((s, p) => s + Number(p.amount), 0),
        current_balance: Number(client[0].current_balance)
      }
    });
  } catch (e) {
    console.error('Statement endpoint error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Resumen general de saldos pendientes por cliente en un rango de fechas
app.get("/api/cxc/pending-summary", async (req, res) => {
  try {
    const centerId = req.query.center_id ? Number(req.query.center_id) : null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;

    let whereCharge = `cxa.id IS NOT NULL`;
    const chargeParams = [];
    if (startDate) { whereCharge += ` AND cxa.created_at >= ?`; chargeParams.push(startDate); }
    if (endDate) { whereCharge += ` AND cxa.created_at <= ?`; chargeParams.push(`${endDate} 23:59:59`); }
    if (centerId) { whereCharge += ` AND t.operation_center_id = ?`; chargeParams.push(centerId); }

    let rows = [];
    let centers = [];

    try {
      const [result] = await query(
        `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, ca.name as area_name,
                COUNT(DISTINCT cxa.id) as account_count,
                COALESCE(SUM(cxa.amount), 0) as total_charged,
                COALESCE(SUM(cxp.amount), 0) as total_paid
         FROM customers c
         LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
         LEFT JOIN cxc_accounts cxa ON cxa.client_id = c.id
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN restaurant_tables t ON t.id = a.table_id
         LEFT JOIN cxc_payments cxp ON cxp.cxc_account_id = cxa.id
         WHERE c.cxc_enabled = 1 AND c.is_active = 1 AND ${whereCharge}
         GROUP BY c.id
         HAVING total_charged > 0
         ORDER BY c.full_name`,
        chargeParams
      );
      rows = result;

      const [centerRows] = await query(
        `SELECT DISTINCT oc.id, oc.name
         FROM cxc_accounts cxa
         INNER JOIN accounts a ON cxa.account_id = a.id
         INNER JOIN restaurant_tables t ON t.id = a.table_id
         INNER JOIN operation_centers oc ON oc.id = t.operation_center_id
         ORDER BY oc.name`
      );
      centers = centerRows;
    } catch (e) {
      console.error('Pending-summary query error:', e.message);
      // Fallback without operation_centers/restaurant_tables
      const fallbackWhere = `cxa.id IS NOT NULL`;
      let fbParams = [];
      if (startDate) { fbParams.push(startDate); }
      if (endDate) { fbParams.push(`${endDate} 23:59:59`); }

      let fbWhere = fallbackWhere;
      if (startDate) fbWhere += ` AND cxa.created_at >= ?`;
      if (endDate) fbWhere += ` AND cxa.created_at <= ?`;

      const [result] = await query(
        `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, ca.name as area_name,
                COUNT(DISTINCT cxa.id) as account_count,
                COALESCE(SUM(cxa.amount), 0) as total_charged,
                COALESCE(SUM(cxp.amount), 0) as total_paid
         FROM customers c
         LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
         LEFT JOIN cxc_accounts cxa ON cxa.client_id = c.id
         LEFT JOIN cxc_payments cxp ON cxp.cxc_account_id = cxa.id
         WHERE c.cxc_enabled = 1 AND c.is_active = 1 AND ${fbWhere}
         GROUP BY c.id
         HAVING total_charged > 0
         ORDER BY c.full_name`,
        fbParams
      );
      rows = result;
    }

    const summary = rows.map(r => ({
      ...r,
      balance: Number(r.total_charged) - Number(r.total_paid)
    }));

    res.json({
      clients: summary,
      centers,
      totals: {
        total_clients: summary.length,
        total_charged: summary.reduce((s, r) => s + Number(r.total_charged), 0),
        total_paid: summary.reduce((s, r) => s + Number(r.total_paid), 0),
        total_balance: summary.reduce((s, r) => s + (Number(r.total_charged) - Number(r.total_paid)), 0)
      }
    });
  } catch (e) {
    console.error('Pending-summary endpoint error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- EXCEL EXPORTS ----------

async function getReportUser(req) {
  try {
    const session = getAuthSession(req);
    if (!session) return 'Usuario';
    const [rows] = await query(`SELECT full_name FROM staff_users WHERE id = ?`, [Number(session.userId)]);
    return rows.length ? rows[0].full_name : 'Usuario';
  } catch { return 'Usuario'; }
}

function getLogoBuffer() {
  try {
    const logoPath = path.join(__dirname, 'public', 'uploads');
    const files = fs.readdirSync(logoPath).filter(f => f.startsWith('logo_'));
    if (files.length) return fs.readFileSync(path.join(logoPath, files[0]));
  } catch {}
  return null;
}

function addBorders(ws, row, colStart, colEnd) {
  for (let c = colStart; c <= colEnd; c++) {
    ws.getCell(row, c).border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  }
}

function styleHeaderRow(ws, row, cols) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.alignment = { horizontal: c >= cols - 2 ? 'right' : 'left', vertical: 'center', wrapText: true };
  }
  addBorders(ws, row, 1, cols);
}

// Export Estado de Cuenta a Excel
app.get("/api/cxc/export-statement/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const centerId = req.query.center_id ? Number(req.query.center_id) : null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const checkNumber = req.query.check_number || null;

    const [client] = await query(
      `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, c.cxc_enabled, c.is_active, c.created_at, ca.name as area_name
       FROM customers c LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id WHERE c.id = ?`,
      [clientId]
    );
    if (!client.length) return res.status(404).json({ error: "Cliente no encontrado" });

    let accounts = [];
    try {
      const accParams = [clientId];
      let accWhere = `cxa.client_id = ?`;
      if (centerId) { accWhere += ` AND t.operation_center_id = ?`; accParams.push(centerId); }
      if (startDate) { accWhere += ` AND cxa.created_at >= ?`; accParams.push(startDate); }
      if (endDate) { accWhere += ` AND cxa.created_at <= ?`; accParams.push(`${endDate} 23:59:59`); }
      if (checkNumber) { accWhere += ` AND a.check_number LIKE ?`; accParams.push(`%${checkNumber}%`); }
      const [accRows] = await query(
        `SELECT cxa.id, cxa.amount, cxa.balance, cxa.status, cxa.created_at, cxa.reference, cxa.notes,
                a.check_number, u.full_name as waiter_name, oc.name as center_name
         FROM cxc_accounts cxa
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN staff_users u ON a.waiter_id = u.id
         LEFT JOIN restaurant_tables t ON t.id = a.table_id
         LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
         WHERE ${accWhere}
         ORDER BY cxa.created_at ASC`,
        accParams
      );
      accounts = accRows;
    } catch (_) {
      const accParams = [clientId];
      let accWhere = `cxa.client_id = ?`;
      if (startDate) { accWhere += ` AND cxa.created_at >= ?`; accParams.push(startDate); }
      if (endDate) { accWhere += ` AND cxa.created_at <= ?`; accParams.push(`${endDate} 23:59:59`); }
      if (checkNumber) { accWhere += ` AND a.check_number LIKE ?`; accParams.push(`%${checkNumber}%`); }
      const [accRows] = await query(
        `SELECT cxa.id, cxa.amount, cxa.balance, cxa.status, cxa.created_at, cxa.reference, cxa.notes,
                a.check_number, u.full_name as waiter_name, NULL as center_name
         FROM cxc_accounts cxa
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN staff_users u ON a.waiter_id = u.id
         WHERE ${accWhere}
         ORDER BY cxa.created_at ASC`,
        accParams
      );
      accounts = accRows;
    }

    const accountIds = accounts.map(a => a.id);
    let payments = [];
    if (accountIds.length > 0) {
      const payParams = [...accountIds];
      let payWhere = `cp.cxc_account_id IN (${accountIds.map(() => '?').join(',')})`;
      if (startDate) { payWhere += ` AND cp.created_at >= ?`; payParams.push(startDate); }
      if (endDate) { payWhere += ` AND cp.created_at <= ?`; payParams.push(`${endDate} 23:59:59`); }
      const [payRows] = await query(
        `SELECT cp.*, cxa.account_id FROM cxc_payments cp JOIN cxc_accounts cxa ON cp.cxc_account_id = cxa.id WHERE ${payWhere} ORDER BY cp.created_at ASC`,
        payParams
      );
      payments = payRows;
    }

    const movements = [];
    let runningBalance = 0;
    for (const acc of accounts) {
      runningBalance = Number((runningBalance + Number(acc.amount)).toFixed(2));
      movements.push({
        date: acc.created_at, type: 'charge',
        description: `Cargo - ${acc.check_number || `#${acc.id}`}${acc.waiter_name ? ` (${acc.waiter_name})` : ''}`,
        charge: Number(acc.amount), payment: 0, balance: runningBalance,
        center_name: acc.center_name || null
      });
    }
    for (const pay of payments) {
      runningBalance = Number((runningBalance - Number(pay.amount)).toFixed(2));
      const acc = accounts.find(a => a.id === pay.account_id);
      movements.push({
        date: pay.created_at, type: 'payment',
        description: `Pago - ${pay.payment_method}${pay.reference ? ` (Ref: ${pay.reference})` : ''}${acc ? ` - ${acc.check_number || `#${acc.id}`}` : ''}`,
        charge: 0, payment: Number(pay.amount), balance: runningBalance,
        center_name: acc?.center_name || null
      });
    }

    const totals = {
      total_charged: accounts.reduce((s, a) => s + Number(a.amount), 0),
      total_paid: payments.reduce((s, p) => s + Number(p.amount), 0),
      current_balance: Number(client[0].current_balance)
    };
    const user = await getReportUser(req);
    const logoBuf = getLogoBuffer();

    const wb = new ExcelJS.Workbook();
    wb.creator = user;
    wb.created = new Date();
    const ws = wb.addWorksheet('Estado de Cuenta');
    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;

    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 48;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;

    let row = 1;
    if (logoBuf) {
      const imgId = wb.addImage({ buffer: logoBuf, extension: 'png' });
      ws.addImage(imgId, { tl: { col: 0, row: row - 1 }, ext: { width: 80, height: 60 } });
    }
    ws.mergeCells(row, 1, row + 1, 6);
    ws.getCell(row, 1).value = 'ESTADO DE CUENTA';
    ws.getCell(row, 1).font = { bold: true, size: 18, color: { argb: 'FF1F4E79' }, name: 'Calibri' };
    ws.getCell(row, 1).alignment = { horizontal: 'center', vertical: 'center' };
    row += 2;

    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = `Cliente: ${client[0].full_name}${client[0].area_name ? `  |  ${client[0].area_name}` : ''}`;
    ws.getCell(row, 1).font = { bold: true, size: 12, name: 'Calibri' };
    row++;

    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = `Generado por: ${user}  |  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    ws.getCell(row, 1).font = { italic: true, size: 10, color: { argb: 'FF666666' }, name: 'Calibri' };
    row++;

    if (startDate || endDate) {
      ws.mergeCells(row, 1, row, 6);
      ws.getCell(row, 1).value = `Período: ${startDate || '—'}  al  ${endDate || '—'}`;
      ws.getCell(row, 1).font = { size: 10, color: { argb: 'FF666666' }, name: 'Calibri' };
      row++;
    }
    row++;

    const summaryData = [
      { label: 'Total Cargado', value: totals.total_charged, color: 'FF000000' },
      { label: 'Total Pagado', value: totals.total_paid, color: 'FF008000' },
      { label: 'Saldo Actual', value: totals.current_balance, color: totals.current_balance > 0 ? 'FFFF0000' : 'FF008000' },
      { label: 'Límite Crédito', value: Number(client[0].credit_limit || 0), color: 'FF000000' },
    ];
    ws.getRow(row).height = 50;
    summaryData.forEach((d, i) => {
      const c = i + 1;
      ws.getCell(row, c).value = d.label;
      ws.getCell(row, c).font = { size: 9, color: { argb: 'FF666666' }, name: 'Calibri' };
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true };
      ws.getCell(row + 1, c).value = `Q${d.value.toFixed(2)}`;
      ws.getCell(row + 1, c).font = { bold: true, size: 16, color: { argb: d.color }, name: 'Calibri' };
      ws.getCell(row + 1, c).alignment = { horizontal: 'center', vertical: 'top' };
      addBorders(ws, row, c, c);
      addBorders(ws, row + 1, c, c);
      ws.getCell(row + 1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    });
    row += 3;

    styleHeaderRow(ws, row, 6);
    row++;

    movements.forEach((m, i) => {
      ws.getCell(row, 1).value = new Date(m.date);
      ws.getCell(row, 1).numFmt = 'dd/mm/yyyy';
      ws.getCell(row, 1).alignment = { vertical: 'center' };
      ws.getCell(row, 2).value = m.description;
      ws.getCell(row, 2).alignment = { vertical: 'center', wrapText: true };
      ws.getCell(row, 3).value = m.center_name || '-';
      ws.getCell(row, 3).alignment = { vertical: 'center' };

      if (m.charge > 0) {
        ws.getCell(row, 4).value = m.charge;
        ws.getCell(row, 4).numFmt = '#,##0.00';
        ws.getCell(row, 4).font = { color: { argb: 'FFFF0000' }, bold: true };
      } else {
        ws.getCell(row, 4).value = '-';
      }
      ws.getCell(row, 4).alignment = { horizontal: 'right', vertical: 'center' };

      if (m.payment > 0) {
        ws.getCell(row, 5).value = m.payment;
        ws.getCell(row, 5).numFmt = '#,##0.00';
        ws.getCell(row, 5).font = { color: { argb: 'FF008000' }, bold: true };
      } else {
        ws.getCell(row, 5).value = '-';
      }
      ws.getCell(row, 5).alignment = { horizontal: 'right', vertical: 'center' };

      ws.getCell(row, 6).value = m.balance;
      ws.getCell(row, 6).numFmt = '#,##0.00';
      ws.getCell(row, 6).font = { bold: true, color: { argb: m.balance > 0 ? 'FFFF0000' : 'FF008000' } };
      ws.getCell(row, 6).alignment = { horizontal: 'right', vertical: 'center' };

      if (i % 2 === 1) {
        for (let c = 1; c <= 6; c++) ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
      }
      addBorders(ws, row, 1, 6);
      row++;
    });

    const totalRow = row;
    for (let c = 1; c <= 6; c++) {
      ws.getCell(totalRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      ws.getCell(totalRow, c).font = { bold: true, size: 11, name: 'Calibri' };
    }
    ws.mergeCells(totalRow, 1, totalRow, 3);
    ws.getCell(totalRow, 1).value = 'TOTALES';
    ws.getCell(totalRow, 4).value = totals.total_charged;
    ws.getCell(totalRow, 4).numFmt = '#,##0.00';
    ws.getCell(totalRow, 4).font = { bold: true, color: { argb: 'FFFF0000' }, size: 11, name: 'Calibri' };
    ws.getCell(totalRow, 4).alignment = { horizontal: 'right' };
    ws.getCell(totalRow, 5).value = totals.total_paid;
    ws.getCell(totalRow, 5).numFmt = '#,##0.00';
    ws.getCell(totalRow, 5).font = { bold: true, color: { argb: 'FF008000' }, size: 11, name: 'Calibri' };
    ws.getCell(totalRow, 5).alignment = { horizontal: 'right' };
    ws.getCell(totalRow, 6).value = totals.current_balance;
    ws.getCell(totalRow, 6).numFmt = '#,##0.00';
    ws.getCell(totalRow, 6).font = { bold: true, color: { argb: totals.current_balance > 0 ? 'FFFF0000' : 'FF008000' }, size: 11, name: 'Calibri' };
    ws.getCell(totalRow, 6).alignment = { horizontal: 'right' };
    addBorders(ws, totalRow, 1, 6);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Estado_Cuenta_${client[0].full_name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('Export statement error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Export Reporte General de Saldos a Excel
app.get("/api/cxc/export-pending-summary", async (req, res) => {
  try {
    const centerId = req.query.center_id ? Number(req.query.center_id) : null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;

    let rows = [];
    try {
      let whereCharge = `cxa.id IS NOT NULL`;
      const chargeParams = [];
      if (startDate) { whereCharge += ` AND cxa.created_at >= ?`; chargeParams.push(startDate); }
      if (endDate) { whereCharge += ` AND cxa.created_at <= ?`; chargeParams.push(`${endDate} 23:59:59`); }
      if (centerId) { whereCharge += ` AND t.operation_center_id = ?`; chargeParams.push(centerId); }

      const [result] = await query(
        `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, ca.name as area_name,
                COUNT(DISTINCT cxa.id) as account_count,
                COALESCE(SUM(cxa.amount), 0) as total_charged,
                COALESCE(SUM(cxp.amount), 0) as total_paid
         FROM customers c
         LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
         LEFT JOIN cxc_accounts cxa ON cxa.client_id = c.id
         LEFT JOIN accounts a ON cxa.account_id = a.id
         LEFT JOIN restaurant_tables t ON t.id = a.table_id
         LEFT JOIN cxc_payments cxp ON cxp.cxc_account_id = cxa.id
         WHERE c.cxc_enabled = 1 AND c.is_active = 1 AND ${whereCharge}
         GROUP BY c.id
         HAVING total_charged > 0
         ORDER BY c.full_name`,
        chargeParams
      );
      rows = result;
    } catch (_) {
      let fbWhere = `cxa.id IS NOT NULL`;
      let fbParams = [];
      if (startDate) { fbWhere += ` AND cxa.created_at >= ?`; fbParams.push(startDate); }
      if (endDate) { fbWhere += ` AND cxa.created_at <= ?`; fbParams.push(`${endDate} 23:59:59`); }
      const [result] = await query(
        `SELECT c.id, c.full_name, c.phone, c.credit_limit, c.current_balance, ca.name as area_name,
                COUNT(DISTINCT cxa.id) as account_count,
                COALESCE(SUM(cxa.amount), 0) as total_charged,
                COALESCE(SUM(cxp.amount), 0) as total_paid
         FROM customers c
         LEFT JOIN cxc_areas ca ON c.cxc_area_id = ca.id
         LEFT JOIN cxc_accounts cxa ON cxa.client_id = c.id
         LEFT JOIN cxc_payments cxp ON cxp.cxc_account_id = cxa.id
         WHERE c.cxc_enabled = 1 AND c.is_active = 1 AND ${fbWhere}
         GROUP BY c.id
         HAVING total_charged > 0
         ORDER BY c.full_name`,
        fbParams
      );
      rows = result;
    }

    const user = await getReportUser(req);
    const logoBuf = getLogoBuffer();
    const totals = {
      total_clients: rows.length,
      total_charged: rows.reduce((s, r) => s + Number(r.total_charged), 0),
      total_paid: rows.reduce((s, r) => s + Number(r.total_paid), 0),
      total_balance: rows.reduce((s, r) => s + (Number(r.total_charged) - Number(r.total_paid)), 0)
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = user;
    wb.created = new Date();
    const ws = wb.addWorksheet('Saldos Pendientes');
    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage = true;

    ws.getColumn(1).width = 30;
    ws.getColumn(2).width = 22;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;

    let row = 1;
    if (logoBuf) {
      const imgId = wb.addImage({ buffer: logoBuf, extension: 'png' });
      ws.addImage(imgId, { tl: { col: 0, row: row - 1 }, ext: { width: 80, height: 60 } });
    }
    ws.mergeCells(row, 1, row + 1, 6);
    ws.getCell(row, 1).value = 'REPORTE GENERAL DE SALDOS';
    ws.getCell(row, 1).font = { bold: true, size: 18, color: { argb: 'FF1F4E79' }, name: 'Calibri' };
    ws.getCell(row, 1).alignment = { horizontal: 'center', vertical: 'center' };
    row += 2;

    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = `Generado por: ${user}  |  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    ws.getCell(row, 1).font = { italic: true, size: 10, color: { argb: 'FF666666' }, name: 'Calibri' };
    row++;

    if (startDate || endDate) {
      ws.mergeCells(row, 1, row, 6);
      ws.getCell(row, 1).value = `Período: ${startDate || '—'}  al  ${endDate || '—'}`;
      ws.getCell(row, 1).font = { size: 10, color: { argb: 'FF666666' }, name: 'Calibri' };
      row++;
    }
    row++;

    const kpis = [
      { label: 'Clientes', value: totals.total_clients, color: 'FF000000', fmt: '0' },
      { label: 'Total Cargado', value: totals.total_charged, color: 'FF000000', fmt: '#,##0.00' },
      { label: 'Total Pagado', value: totals.total_paid, color: 'FF008000', fmt: '#,##0.00' },
      { label: 'Saldo Total', value: totals.total_balance, color: totals.total_balance > 0 ? 'FFFF0000' : 'FF008000', fmt: '#,##0.00' },
    ];
    ws.getRow(row).height = 50;
    kpis.forEach((k, i) => {
      const c = i + 1;
      ws.getCell(row, c).value = k.label;
      ws.getCell(row, c).font = { size: 9, color: { argb: 'FF666666' }, name: 'Calibri' };
      ws.getCell(row, c).alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true };
      ws.getCell(row + 1, c).value = typeof k.value === 'number' && k.fmt === '#,##0.00' ? k.value : k.value;
      if (k.fmt === '#,##0.00') ws.getCell(row + 1, c).numFmt = k.fmt;
      ws.getCell(row + 1, c).font = { bold: true, size: 16, color: { argb: k.color }, name: 'Calibri' };
      ws.getCell(row + 1, c).alignment = { horizontal: 'center', vertical: 'top' };
      addBorders(ws, row, c, c);
      addBorders(ws, row + 1, c, c);
      ws.getCell(row + 1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    });
    row += 3;

    ['Cliente', 'Área', 'Cuentas', 'Cargado', 'Pagado', 'Saldo'].forEach((label, i) => {
      ws.getCell(row, i + 1).value = label;
    });
    styleHeaderRow(ws, row, 6);
    row++;

    rows.forEach((r, i) => {
      const balance = Number(r.total_charged) - Number(r.total_paid);
      ws.getCell(row, 1).value = r.full_name;
      ws.getCell(row, 1).alignment = { vertical: 'center' };
      ws.getCell(row, 2).value = r.area_name || '-';
      ws.getCell(row, 2).alignment = { vertical: 'center' };
      ws.getCell(row, 3).value = Number(r.account_count);
      ws.getCell(row, 3).alignment = { horizontal: 'right', vertical: 'center' };
      ws.getCell(row, 4).value = Number(r.total_charged);
      ws.getCell(row, 4).numFmt = '#,##0.00';
      ws.getCell(row, 4).alignment = { horizontal: 'right', vertical: 'center' };
      ws.getCell(row, 5).value = Number(r.total_paid);
      ws.getCell(row, 5).numFmt = '#,##0.00';
      ws.getCell(row, 5).font = { color: { argb: 'FF008000' } };
      ws.getCell(row, 5).alignment = { horizontal: 'right', vertical: 'center' };
      ws.getCell(row, 6).value = balance;
      ws.getCell(row, 6).numFmt = '#,##0.00';
      ws.getCell(row, 6).font = { bold: true, color: { argb: balance > 0 ? 'FFFF0000' : 'FF008000' } };
      ws.getCell(row, 6).alignment = { horizontal: 'right', vertical: 'center' };

      if (i % 2 === 1) {
        for (let c = 1; c <= 6; c++) ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
      }
      addBorders(ws, row, 1, 6);
      row++;
    });

    const totalRow = row;
    for (let c = 1; c <= 6; c++) {
      ws.getCell(totalRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      ws.getCell(totalRow, c).font = { bold: true, size: 11, name: 'Calibri' };
    }
    ws.mergeCells(totalRow, 1, totalRow, 2);
    ws.getCell(totalRow, 1).value = `${totals.total_clients} clientes`;
    ws.getCell(totalRow, 3).value = rows.reduce((s, r) => s + Number(r.account_count), 0);
    ws.getCell(totalRow, 3).alignment = { horizontal: 'right' };
    ws.getCell(totalRow, 4).value = totals.total_charged;
    ws.getCell(totalRow, 4).numFmt = '#,##0.00';
    ws.getCell(totalRow, 4).font = { bold: true, size: 11, name: 'Calibri' };
    ws.getCell(totalRow, 4).alignment = { horizontal: 'right' };
    ws.getCell(totalRow, 5).value = totals.total_paid;
    ws.getCell(totalRow, 5).numFmt = '#,##0.00';
    ws.getCell(totalRow, 5).font = { bold: true, color: { argb: 'FF008000' }, size: 11, name: 'Calibri' };
    ws.getCell(totalRow, 5).alignment = { horizontal: 'right' };
    ws.getCell(totalRow, 6).value = totals.total_balance;
    ws.getCell(totalRow, 6).numFmt = '#,##0.00';
    ws.getCell(totalRow, 6).font = { bold: true, color: { argb: totals.total_balance > 0 ? 'FFFF0000' : 'FF008000' }, size: 11, name: 'Calibri' };
    ws.getCell(totalRow, 6).alignment = { horizontal: 'right' };
    addBorders(ws, totalRow, 1, 6);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Reporte_Saldos_Pendientes.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('Export pending-summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/shifts/open", async (req, res) => {
  const { cashierId, note = "", centerId } = req.body || {};
  if (!cashierId || !centerId) return res.status(400).json({ error: "cashierId y centerId son requeridos" });

  const [openShift] = await query(`SELECT id FROM shifts WHERE status = 'open' AND operation_center_id = ? LIMIT 1`, [Number(centerId)]);
  if (openShift.length) return res.status(400).json({ error: "Ya existe un turno abierto en este centro" });

  const [result] = await query(
    `INSERT INTO shifts (cashier_id, operation_center_id, opened_at, opening_note, status) VALUES (?, ?, ?, ?, 'open')`,
    [cashierId, Number(centerId), nowSql(), note]
  );
  res.status(201).json({ shiftId: result.insertId });
});

app.post("/api/shifts/close", async (req, res) => {
  const { cashierId, note = "", centerId } = req.body || {};
  if (!centerId) return res.status(400).json({ error: "centerId es requerido" });
  const [openShift] = await query(
    `SELECT id, opened_at FROM shifts WHERE status = 'open' AND operation_center_id = ? ORDER BY id DESC LIMIT 1`,
    [Number(centerId)]
  );
  if (!openShift.length) return res.status(400).json({ error: "No hay turno abierto en este centro" });
  const shiftId = openShift[0].id;

  const [summary] = await query(
    `SELECT
      COUNT(a.id) AS total_checks,
      COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END), 0) AS card_total,
      COALESCE(SUM(p.amount), 0) AS grand_total
     FROM accounts a
     LEFT JOIN account_payments p ON p.account_id = a.id
     WHERE a.shift_id = ?`,
    [shiftId]
  );

  await query(
    `UPDATE shifts SET status = 'closed', closed_at = ?, closing_note = ?, cashier_id = ? WHERE id = ?`,
    [nowSql(), note, cashierId, shiftId]
  );
  res.json({ shiftId, openedAt: openShift[0].opened_at, closedAt: nowSql(), summary: summary[0] });
});

app.get("/api/reports/voided-items", async (_req, res) => {
  const [rows] = await query(
    `SELECT oi.id, a.check_number, p.name AS product_name, oi.void_reason, oi.voided_at
     FROM order_items oi
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.status = 'void'
     ORDER BY oi.voided_at DESC`
  );
  res.json(rows);
});

app.get("/api/reports/waiter-tips", async (_req, res) => {
  res.json([]);
});

app.get("/api/reports/account-trace/:accountId", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const [rows] = await query(
    `SELECT id, event_type, payload, created_at
     FROM account_events
     WHERE account_id = ?
     ORDER BY id`,
    [accountId]
  );
  res.json(rows);
});

// Inventory items CRUD
app.get("/api/inventory/items", async (_req, res) => {
  try {
    const [rows] = await query(
      `SELECT id, name, unit, current_stock, min_stock, cost_price, is_active
       FROM inventory_items WHERE is_active = 1 ORDER BY name`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/inventory/items", async (req, res) => {
  try {
    const { name, unit = 'pz', costPrice = 0, minStock = 0 } = req.body || {};
    if (!name) return res.status(400).json({ error: "name es requerido" });
    const [result] = await query(
      `INSERT INTO inventory_items (name, unit, cost_price, min_stock) VALUES (?, ?, ?, ?)`,
      [String(name).trim(), String(unit), Number(costPrice) || 0, Number(minStock) || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/inventory/items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, unit, costPrice, minStock } = req.body || {};
    await query(
      `UPDATE inventory_items SET name = ?, unit = ?, cost_price = ?, min_stock = ? WHERE id = ?`,
      [String(name).trim(), String(unit), Number(costPrice) || 0, Number(minStock) || 0, id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/inventory/items/:id", async (req, res) => {
  try {
    await query(`UPDATE inventory_items SET is_active = 0 WHERE id = ?`, [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Stock movements
app.get("/api/inventory/items/:id/movements", async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT id, type, quantity, reference_type, reference_id, note, created_by, created_at
       FROM stock_movements WHERE inventory_item_id = ? ORDER BY created_at DESC LIMIT 200`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/inventory/movements", async (req, res) => {
  try {
    const { inventoryItemId, type, quantity, note = '' } = req.body || {};
    if (!inventoryItemId || !type || !quantity) {
      return res.status(400).json({ error: "inventoryItemId, type y quantity son requeridos" });
    }
    const qty = Number(quantity);
    if (qty <= 0) return res.status(400).json({ error: "quantity debe ser mayor a 0" });
    await query(
      `INSERT INTO stock_movements (inventory_item_id, type, quantity, note, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(inventoryItemId), String(type), qty, String(note), nowSql()]
    );
    const sign = type === 'exit' ? -1 : 1;
    await query(
      `UPDATE inventory_items SET current_stock = current_stock + (? * ?) WHERE id = ?`,
      [sign, qty, Number(inventoryItemId)]
    );
    res.status(201).json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Product recipes
app.get("/api/inventory/products/:productId/recipe", async (req, res) => {
  try {
    const [rows] = await query(
      `SELECT pr.id, pr.inventory_item_id, pr.quantity, ii.name AS item_name, ii.unit
       FROM product_recipes pr
       INNER JOIN inventory_items ii ON ii.id = pr.inventory_item_id
       WHERE pr.product_id = ?`,
      [Number(req.params.productId)]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/inventory/products/:productId/recipe", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const { ingredients } = req.body || {};
    await query(`DELETE FROM product_recipes WHERE product_id = ?`, [productId]);
    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        await query(
          `INSERT INTO product_recipes (product_id, inventory_item_id, quantity) VALUES (?, ?, ?)`,
          [productId, Number(ing.inventoryItemId), Number(ing.quantity)]
        );
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use((err, req, res, _next) => {
  const status = Number(err?.status || err?.statusCode || 500);
  const code = String(err?.code || (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"));
  const message = String(err?.message || "Error interno");
  const detail = err?.detail || (!IS_PROD && status >= 500 ? err?.stack || err?.message : null);

  console.error(`[${req?.traceId || "no-trace"}]`, err);
  res.status(status).json({
    code,
    message,
    error: message,
    status,
    traceId: req?.traceId || null,
    detail: detail || null,
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
  try {
    await ensureConfigTables();
    await pool.query("SELECT 1");
    console.log(`POS activo en http://localhost:${port}`);
  } catch (e) {
    console.error('Pending-summary endpoint error:', e);
    res.status(500).json({ error: e.message });
  }
});
