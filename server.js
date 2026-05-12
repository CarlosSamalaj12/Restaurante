require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { pool, query } = require("./src/db");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PAYMENT_METHOD_DEFAULTS = [
  { code: "cash", label: "Efectivo" },
  { code: "card", label: "Tarjeta" },
  { code: "transfer", label: "Transferencia" },
  { code: "credit_folio", label: "Folio (CxC)" },
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
  await safeExec(`ALTER TABLE dining_areas ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE dining_areas ADD COLUMN sort_order INT NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE order_items ADD COLUMN sent_at DATETIME NULL`);
  await safeExec(`ALTER TABLE account_payments MODIFY COLUMN method VARCHAR(50) NOT NULL`);
  await safeExec(`ALTER TABLE accounts ADD COLUMN tip_percent_override DECIMAL(5,2) NULL`);

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
    `SELECT id, name
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
  const restaurantName = await getRestaurantName();

  res.json({ tables, waiters, cashiers, categories, paymentMethods, customers, centers, defaultCenterId, autoCenterId, terminalIp: ip, restaurantName });
});

app.post("/api/auth/pin-login", async (req, res) => {
  const pin = String(req.body?.pin || "").trim();
  if (!/^\d{6,}$/.test(pin)) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 dígitos numéricos" });
  }
  const [rows] = await query(
    `SELECT id, full_name, role
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
      COUNT(DISTINCT ac.id) AS open_accounts,
      COALESCE(MAX(oi.created_at), MAX(ac.opened_at)) AS last_activity_at
    FROM restaurant_tables t
    INNER JOIN dining_areas a ON a.id = t.area_id
    LEFT JOIN accounts ac ON ac.table_id = t.id AND ac.status = 'open'
    LEFT JOIN order_items oi ON oi.account_id = ac.id AND oi.status = 'active'
    WHERE t.is_active = 1 AND (? = 0 OR t.operation_center_id = ?)
    GROUP BY t.id, t.code, t.seats, a.name, t.operation_center_id
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
    `SELECT id, name, is_active, sort_order
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
  const tipPercent = await getTipPercent();
  const restaurantName = await getRestaurantName();
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
    currentIp,
    tipPercent,
    restaurantName,
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
  const { areaId, code, seats = 4, isActive = 1, centerId = null } = req.body || {};
  if (!areaId || !code || !centerId) return res.status(400).json({ error: "areaId, centerId y code son requeridos" });
  await query(
    `INSERT INTO restaurant_tables (area_id, operation_center_id, code, seats, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [Number(areaId), Number(centerId), String(code).trim(), Number(seats) || 4, Number(isActive) ? 1 : 0]
  );
  res.status(201).json({ ok: true });
});

app.post("/api/settings/tables/:tableId", async (req, res) => {
  const tableId = Number(req.params.tableId);
  const { areaId, code, seats = 4, isActive = 1, centerId = null } = req.body || {};
  if (!tableId || !areaId || !code || !centerId) {
    return res.status(400).json({ error: "tableId, areaId, centerId y code son requeridos" });
  }
  await query(
    `UPDATE restaurant_tables
     SET area_id = ?, operation_center_id = ?, code = ?, seats = ?, is_active = ?
     WHERE id = ?`,
    [Number(areaId), Number(centerId), String(code).trim(), Number(seats) || 4, Number(isActive) ? 1 : 0, tableId]
  );
  res.json({ ok: true });
});

app.post("/api/settings/categories", async (req, res) => {
  const { name, isActive = 1, sortOrder = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: "name es requerido" });
  const [result] = await query(
    `INSERT INTO product_categories (name, is_active, sort_order)
     VALUES (?, ?, ?)`,
    [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0]
  );
  res.status(201).json({ categoryId: result.insertId });
});

app.post("/api/settings/categories/:categoryId", async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const { name, isActive = 1, sortOrder = 0 } = req.body || {};
  if (!categoryId || !name) return res.status(400).json({ error: "categoryId y name son requeridos" });
  await query(
    `UPDATE product_categories
     SET name = ?, is_active = ?, sort_order = ?
     WHERE id = ?`,
    [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, categoryId]
  );
  res.json({ ok: true });
});

app.post("/api/settings/areas", async (req, res) => {
  const { name, isActive = 1, sortOrder = 0 } = req.body || {};
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
  const { name, areaId, tableCount = 0, tablePrefix = "M" } = req.body || {};
  if (!name || !areaId) return res.status(400).json({ error: "name y areaId son requeridos" });
  const [inserted] = await query(
    `INSERT INTO operation_centers (name, is_active) VALUES (?, 1)`,
    [String(name).trim()]
  );
  const centerId = Number(inserted.insertId);
  const count = Math.max(0, Number(tableCount) || 0);
  const prefix = String(tablePrefix || "M").trim() || "M";
  for (let i = 1; i <= count; i += 1) {
    await query(
      `INSERT INTO restaurant_tables (area_id, operation_center_id, code, seats, is_active)
       VALUES (?, ?, ?, 4, 1)`,
      [Number(areaId), centerId, `${prefix}${i}`]
    );
  }
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
  const { categoryId, name, basePrice = 0, allowDiscount = 1 } = req.body || {};
  if (!categoryId || !name) return res.status(400).json({ error: "categoryId y name son requeridos" });
  const [result] = await query(
    `INSERT INTO products (category_id, name, base_price, allow_discount, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [Number(categoryId), String(name).trim(), Number(basePrice) || 0, Number(allowDiscount) ? 1 : 0]
  );
  res.status(201).json({ productId: result.insertId });
});

app.post("/api/settings/products/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const { categoryId, name, basePrice = 0, allowDiscount = 1, isActive = 1 } = req.body || {};
  if (!productId || !categoryId || !name) {
    return res.status(400).json({ error: "productId, categoryId y name son requeridos" });
  }
  await query(
    `UPDATE products
     SET category_id = ?, name = ?, base_price = ?, allow_discount = ?, is_active = ?
     WHERE id = ?`,
    [Number(categoryId), String(name).trim(), Number(basePrice) || 0, Number(allowDiscount) ? 1 : 0, Number(isActive) ? 1 : 0, productId]
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
    `INSERT INTO accounts (table_id, waiter_id, shift_id, customer_id, status, guest_count, check_number, opened_at)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`,
    [tableId, waiterId, shiftId, customerId, guestCount, tempCheckNumber, nowSql()]
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
    `SELECT p.id, p.name, p.base_price
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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno", detail: err.message });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
  try {
    await ensureConfigTables();
    await pool.query("SELECT 1");
    console.log(`POS activo en http://localhost:${port}`);
  } catch (e) {
    console.error("No se pudo conectar a MariaDB. Revisa variables en .env", e.message);
  }
});
