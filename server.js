require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const ExcelJS = require("exceljs");
const { pool, query } = require("./src/db");
const license = require("./src/license");
const printService = require("./server/print-service");

// Migraciones de esquema — se ejecutan una vez al iniciar
(async () => {
  try {
    await query(
      `ALTER TABLE accounts ADD COLUMN merged_into_account_id INT NULL AFTER status`
    );
    console.log('[MIGRATION] Columna merged_into_account_id agregada a accounts');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[MIGRATION] Columna merged_into_account_id ya existe — OK');
    } else {
      console.warn('[MIGRATION] Error al agregar columna:', e.message);
    }
  }

  // Tablas del sistema de licencias
  try {
    await license.ensureLicenseTables();
    console.log('[MIGRATION] Tablas de licencias OK');
    await license.expireOverdueLicenses();
  } catch (e) {
    console.error('[MIGRATION] Error en tablas de licencias:', e.message);
  }

  // ───────── Printers: columnas en production_centers ─────────
  try {
    await query(
      `ALTER TABLE production_centers
       ADD COLUMN printer_ip VARCHAR(45) NULL AFTER printer_name,
       ADD COLUMN printer_port INT NOT NULL DEFAULT 9100 AFTER printer_ip`
    );
    console.log('[MIGRATION] printer_ip/printer_port agregados a production_centers');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[MIGRATION] printer_ip/printer_port ya existen en production_centers — OK');
    } else {
      console.warn('[MIGRATION] Error al agregar columnas de printer a production_centers:', e.message);
    }
  }

  // ───────── Printers: tabla print_jobs (log de impresiones) ─────────
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS print_jobs (
         id INT AUTO_INCREMENT PRIMARY KEY,
         printer_target VARCHAR(120) NOT NULL,
         printer_ip VARCHAR(45) NULL,
         printer_port INT NULL,
         job_type ENUM('kitchen_ticket','customer_receipt','test') NOT NULL,
         account_id INT NULL,
         payload_size INT NULL,
         status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
         attempts INT NOT NULL DEFAULT 0,
         error_message TEXT NULL,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         completed_at TIMESTAMP NULL,
         INDEX idx_print_status (status),
         INDEX idx_print_account (account_id),
         INDEX idx_print_created (created_at),
         INDEX idx_print_target (printer_target, created_at)
       )`
    );
    console.log('[MIGRATION] Tabla print_jobs OK');
  } catch (e) {
    console.warn('[MIGRATION] Error al crear tabla print_jobs:', e.message);
  }

  // ───────── auth_sessions (persistencia de sesiones de login) ─────────
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token            VARCHAR(64) PRIMARY KEY,
        user_id          INT NOT NULL,
        role             VARCHAR(40) NOT NULL,
        permissions_json JSON NULL,
        expires_at       DATETIME NOT NULL,
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at     DATETIME NULL,
        ip_address       VARCHAR(45) NULL,
        user_agent       VARCHAR(255) NULL,
        INDEX idx_user (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[MIGRATION] Tabla auth_sessions OK');

    // Cleanup inicial: borrar sesiones ya expiradas que pudieran existir
    // de pruebas anteriores.
    const [delResult] = await query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
    if (delResult.affectedRows > 0) {
      console.log(`[MIGRATION] auth_sessions: ${delResult.affectedRows} sesiones expiradas purgadas`);
    }

    // Job periódico: cada 1 hora borra sesiones expiradas de la DB.
    // El Map en memoria las borra on-demand al hacer getAuthSession, pero la
    // DB puede acumular miles de rows viejas si no se limpia.
    setInterval(async () => {
      try {
        const [r] = await query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
        if (r.affectedRows > 0) {
          console.log(`[auth.session.cleanup] ${r.affectedRows} sesiones expiradas purgadas`);
        }
      } catch (e) {
        // best-effort, no rompemos el server
      }
    }, 60 * 60 * 1000);
  } catch (e) {
    console.warn('[MIGRATION] Error al crear tabla auth_sessions:', e.message);
  }
})();

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

// ───────── License system ─────────
// Endpoints públicos (no requieren licencia activa)
app.post("/api/license/enroll", license.enroll);
app.post("/api/license/heartbeat", license.heartbeat);
app.get("/api/license/status", license.status);

// Middleware global: en /api/*, exige terminal autorizada, salvo rutas exentas.
const LICENSE_EXEMPT_PATHS = [
  "/api/license",      // el sistema de licencias se gestiona a sí mismo
  "/api/bootstrap",    // entrega datos iniciales antes del login
];
app.use("/api", (req, res, next) => {
  // ⚠️ Dentro de app.use("/api", ...) Express quita el prefijo de req.path
  // (queda "/bootstrap", "/settings"...). Hay que comparar contra la ruta
  // COMPLETA con req.originalUrl, si no las exenciones nunca matchean y
  // /api/bootstrap devuelve 403 aunque está exento.
  const fullPath = req.originalUrl.split("?")[0];
  // /api/settings/* y /api/admin/* ya están protegidos con requireAdmin
  if (fullPath.startsWith("/api/settings") || fullPath.startsWith("/api/admin")) {
    return next();
  }
  if (LICENSE_EXEMPT_PATHS.some((p) => fullPath.startsWith(p))) {
    return next();
  }
  return license.requireLicensedTerminal(req, res, next);
});

// Endpoints admin (requieren rol admin)
app.get("/api/admin/licenses", requireAdmin, license.listLicenses);
app.post("/api/admin/licenses", requireAdmin, license.createLicense);
app.post("/api/admin/licenses/:id/revoke", requireAdmin, license.revokeLicense);
app.get("/api/admin/terminals", requireAdmin, license.listTerminals);
app.post("/api/admin/terminals/:id/approve", requireAdmin, license.approveTerminal);
app.post("/api/admin/terminals/:id/revoke", requireAdmin, license.revokeTerminal);
app.post("/api/admin/terminals/:id/replace", requireAdmin, license.replaceTerminal);
app.get("/api/admin/license-audit", requireAdmin, license.getAuditLog);

// Job periódico: revisa licencias vencidas cada 6 horas
setInterval(() => {
  license.expireOverdueLicenses().catch((e) =>
    console.error('[license] expirer error:', e.message),
  );
}, 6 * 60 * 60 * 1000);

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
// Cache en memoria de sesiones. La fuente de verdad es la tabla `auth_sessions`
// en la DB; este Map se hidrata on-demand desde la DB para sobrevivir reinicios.
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

async function createAuthSession(user, meta = {}) {
  const token = crypto.randomUUID();
  let permissions = [];
  try {
    permissions = await getUserPermissions(Number(user.id));
  } catch (_) {}
  const expiresAt = Date.now() + AUTH_SESSION_TTL_MS;
  const session = {
    userId: Number(user.id),
    role: String(user.role || ""),
    permissions,
    expiresAt,
  };
  // Cache en memoria
  authSessions.set(token, session);
  // Persistir en DB (fuente de verdad que sobrevive reinicios)
  try {
    await query(
      `INSERT INTO auth_sessions (token, user_id, role, permissions_json, expires_at, created_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, FROM_UNIXTIME(?/1000), NOW(), ?, ?)`,
      [
        token,
        session.userId,
        session.role,
        JSON.stringify(permissions || []),
        expiresAt,
        String(meta.ip || null).slice(0, 45) || null,
        String(meta.userAgent || null).slice(0, 255) || null,
      ],
    );
  } catch (e) {
    // Si la tabla no existe todavía, logueamos pero no rompemos el login.
    // El Map en memoria sigue funcionando para esta corrida del server.
    console.warn('[auth.session] No se pudo persistir en DB:', e.message);
  }
  return token;
}

async function getAuthSession(req) {
  const token = String(req.headers["x-auth-token"] || "").trim();
  if (!token) return null;
  // 1) Cache en memoria
  let session = authSessions.get(token);
  if (session) {
    if (Date.now() > Number(session.expiresAt || 0)) {
      authSessions.delete(token);
      // Borrar también de DB para que la siguiente request no la hidrate
      query("DELETE FROM auth_sessions WHERE token = ?", [token]).catch(() => {});
      return null;
    }
    return session;
  }
  // 2) DB fallback (sobrevive reinicios)
  try {
    const [rows] = await query(
      `SELECT user_id, role, permissions_json, UNIX_TIMESTAMP(expires_at)*1000 AS expires_ms
       FROM auth_sessions WHERE token = ? LIMIT 1`,
      [token],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    const expiresAt = Number(r.expires_ms || 0);
    if (Date.now() > expiresAt) {
      // Expirada — limpiarla
      query("DELETE FROM auth_sessions WHERE token = ?", [token]).catch(() => {});
      return null;
    }
    let permissions = [];
    try {
      permissions = r.permissions_json ? JSON.parse(r.permissions_json) : [];
    } catch (_) {
      permissions = [];
    }
    session = {
      userId: Number(r.user_id),
      role: String(r.role || ""),
      permissions,
      expiresAt,
    };
    // Hidratar el cache para próximas requests
    authSessions.set(token, session);
    return session;
  } catch (e) {
    // Si la tabla no existe, no rompemos: la sesión simplemente no es válida.
    if (e.code !== 'ER_NO_SUCH_TABLE') {
      console.warn('[auth.session] Error leyendo de DB:', e.message);
    }
    return null;
  }
}

async function deleteAuthSession(token) {
  authSessions.delete(token);
  try {
    await query("DELETE FROM auth_sessions WHERE token = ?", [token]);
  } catch (e) {
    // best-effort
  }
}

async function requireAuth(req, res, next) {
  const session = await getAuthSession(req);
  if (!session) return res.status(401).json({ error: "Sesion invalida o vencida" });
  req.session = session;
  next();
}

async function requireAdmin(req, res, next) {
  try {
    const session = await getAuthSession(req);
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

async function getUserPermissions(userId) {
  const [rows] = await query(
    `SELECT DISTINCT p.slug
     FROM permissions p
     INNER JOIN role_permissions rp ON rp.permission_id = p.id
     INNER JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ?
     ORDER BY p.slug`,
    [Number(userId)]
  );
  return rows.map(r => String(r.slug));
}

function hasPermission(session, slug) {
  if (!session) return false;
  return Array.isArray(session.permissions) && session.permissions.includes(slug);
}

async function requirePermission(slug) {
  return async (req, res, next) => {
    try {
      const session = await getAuthSession(req);
      if (!session) return res.status(401).json({ error: "Sesion invalida o vencida" });
      if (hasPermission(session, slug)) return next();
      return res.status(403).json({ error: "No tienes permiso para esta accion" });
    } catch (err) {
      next(err);
    }
  };
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
  
  // KDS: Add completed_at column to order_items if not exists
  await safeExec(
    `ALTER TABLE order_items ADD COLUMN completed_at DATETIME NULL AFTER sent_at`
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

  await query(
    `CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      slug VARCHAR(40) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE,
      module_code VARCHAR(30) NULL,
      description VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id),
      CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS user_roles (
      user_id INT NOT NULL,
      role_id INT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES staff_users(id),
      CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id)
    )`
  );

  const [existingRoles] = await query(`SELECT COUNT(*) AS cnt FROM roles`);
  if (Number(existingRoles[0].cnt) === 0) {
    const permissionSeeds = [
      { name: 'Ver productos', slug: 'products.view', module: 'restaurant' },
      { name: 'Crear productos', slug: 'products.create', module: 'restaurant' },
      { name: 'Editar productos', slug: 'products.edit', module: 'restaurant' },
      { name: 'Eliminar productos', slug: 'products.delete', module: 'restaurant' },
      { name: 'Gestionar categorías', slug: 'categories.manage', module: 'restaurant' },
      { name: 'Ver mesas', slug: 'tables.view', module: 'restaurant' },
      { name: 'Gestionar mesas', slug: 'tables.manage', module: 'restaurant' },
      { name: 'Tomar órdenes', slug: 'orders.create', module: 'restaurant' },
      { name: 'Modificar órdenes', slug: 'orders.edit', module: 'restaurant' },
      { name: 'Anular items', slug: 'orders.void', module: 'restaurant' },
      { name: 'Enviar a cocina', slug: 'orders.send', module: 'restaurant' },
      { name: 'Aplicar descuentos', slug: 'orders.discount', module: 'restaurant' },
      { name: 'Transferir items/cuentas', slug: 'orders.transfer', module: 'restaurant' },
      { name: 'Cuenta compartida', slug: 'orders.shared', module: 'restaurant' },
      { name: 'Cerrar cuentas', slug: 'accounts.close', module: 'restaurant' },
      { name: 'Anular cuentas', slug: 'accounts.void', module: 'restaurant' },
      { name: 'Reabrir cuentas', slug: 'accounts.reopen', module: 'restaurant' },
      { name: 'Cobrar', slug: 'payments.create', module: 'restaurant' },
      { name: 'Reembolsar', slug: 'payments.refund', module: 'restaurant' },
      { name: 'Abrir turno', slug: 'shifts.open', module: 'restaurant' },
      { name: 'Cerrar turno', slug: 'shifts.close', module: 'restaurant' },
      { name: 'Ver reportes', slug: 'reports.view', module: 'restaurant' },
      { name: 'Exportar reportes', slug: 'reports.export', module: 'restaurant' },
      { name: 'Acceso a configuración', slug: 'settings.access', module: 'restaurant' },
      { name: 'Gestionar usuarios', slug: 'users.manage', module: 'restaurant' },
      { name: 'Gestionar roles/permisos', slug: 'roles.manage', module: 'restaurant' },
      { name: 'Ver inventario', slug: 'inventory.view', module: 'erp' },
      { name: 'Gestionar inventario', slug: 'inventory.manage', module: 'erp' },
      { name: 'Ver CRM', slug: 'crm.view', module: 'crm' },
      { name: 'Gestionar CRM', slug: 'crm.manage', module: 'crm' },
      { name: 'Ver módulo PMS', slug: 'pms.view', module: 'pms' },
    ];

    const permIds = {};
    for (const p of permissionSeeds) {
      const [r] = await query(
        `INSERT INTO permissions (name, slug, module_code, description) VALUES (?, ?, ?, ?)`,
        [p.name, p.slug, p.module, p.name]
      );
      permIds[p.slug] = Number(r.insertId);
    }

    const roleSeeds = [
      {
        name: 'Administrador', slug: 'admin', description: 'Acceso total al sistema',
        perms: permissionSeeds.map(p => p.slug),
      },
      {
        name: 'Gerente', slug: 'manager', description: 'Gestión operativa del restaurante',
        perms: [
          'products.view','products.create','products.edit',
          'categories.manage',
          'tables.view','tables.manage',
          'orders.create','orders.edit','orders.void','orders.send','orders.discount','orders.transfer','orders.shared',
          'accounts.close','accounts.void','accounts.reopen',
          'payments.create','payments.refund',
          'shifts.open','shifts.close',
          'reports.view','reports.export',
          'settings.access',
          'inventory.view','inventory.manage',
          'crm.view','crm.manage',
          'pms.view',
        ],
      },
      {
        name: 'Cajero', slug: 'cashier', description: 'Puede cobrar y gestionar turnos',
        perms: [
          'products.view',
          'tables.view',
          'orders.create','orders.edit','orders.discount','orders.transfer','orders.shared',
          'accounts.close','accounts.void','accounts.reopen',
          'payments.create','payments.refund',
          'shifts.open','shifts.close',
          'reports.view',
        ],
      },
      {
        name: 'Mesero', slug: 'waiter', description: 'Puede tomar órdenes',
        perms: [
          'products.view',
          'tables.view',
          'orders.create','orders.edit','orders.void','orders.send',
          'orders.discount','orders.transfer',
        ],
      },
    ];

    for (const rs of roleSeeds) {
      const [r] = await query(
        `INSERT INTO roles (name, slug, description, is_system) VALUES (?, ?, ?, 1)`,
        [rs.name, rs.slug, rs.description]
      );
      const roleId = Number(r.insertId);
      for (const slug of rs.perms) {
        const pid = permIds[slug];
        if (pid) {
          await query(
            `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [roleId, pid]
          );
        }
      }
    }

    const [allUsers] = await query(`SELECT id, role FROM staff_users`);
    const slugToRoleId = {};
    for (const rs of roleSeeds) {
      const [row] = await query(`SELECT id FROM roles WHERE slug = ? LIMIT 1`, [rs.slug]);
      if (row.length) slugToRoleId[rs.slug] = Number(row[0].id);
    }
    for (const u of allUsers) {
      const roleSlug = String(u.role || 'waiter');
      const roleId = slugToRoleId[roleSlug] || slugToRoleId['waiter'];
      if (roleId) {
        await query(
          `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [Number(u.id), roleId]
        );
      }
    }
  }

  await query(
    `UPDATE roles SET
      name = CASE slug
        WHEN 'admin' THEN 'Administrador'
        WHEN 'manager' THEN 'Gerente'
        WHEN 'cashier' THEN 'Cajero'
        WHEN 'waiter' THEN 'Mesero'
        ELSE name
      END,
      description = CASE slug
        WHEN 'admin' THEN 'Acceso total al sistema'
        WHEN 'manager' THEN 'Gestión operativa del restaurante'
        WHEN 'cashier' THEN 'Puede cobrar y gestionar turnos'
        WHEN 'waiter' THEN 'Puede tomar órdenes'
        ELSE description
      END
    WHERE is_system = 1`
  );

  // Always ensure new permissions are added (even on existing installs)
  const newPermissions = [
    { name: 'Cuenta compartida', slug: 'orders.shared', module: 'restaurant' },
  ];
  for (const p of newPermissions) {
    await query(
      `INSERT IGNORE INTO permissions (name, slug, module_code, description) VALUES (?, ?, ?, ?)`,
      [p.name, p.slug, p.module, p.name]
    );
  }

  await safeExec(`ALTER TABLE restaurant_tables ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE shifts ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE shifts ADD COLUMN opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE shifts ADD COLUMN closing_cash DECIMAL(10,2) NULL`);
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
  await safeExec(`ALTER TABLE product_categories ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE production_centers ADD COLUMN operation_center_id INT NULL`);
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

// Resuelve la terminal del cajero actual para saber en qué impresora
// imprimir el recibo del cliente. Si el usuario no esta logueado o no
// tiene operation_center_id, devuelve null (no se imprime el recibo).
async function resolveTerminalForRequest(req) {
  try {
    const session = await getAuthSession(req);
    if (!session?.userId) return null;
    const [userRows] = await query(
      `SELECT operation_center_id FROM staff_users WHERE id = ? LIMIT 1`,
      [Number(session.userId)]
    );
    const centerId = userRows?.[0]?.operation_center_id;
    if (!centerId) {
      // Sin centro, fallback: tomar la primera terminal activa del sistema
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
  } catch (e) {
    console.warn(`[PRINT] No pude resolver terminal: ${e.message}`);
    return null;
  }
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
  const authToken = await createAuthSession(user, { ip, userAgent: req.headers['user-agent'] });
  res.json({ ok: true, user, allowedModules, authToken });
});

/**
 * POST /api/license/admin-self-approve
 *
 * Endpoint de bootstrap para destrabar el chicken-and-egg del admin:
 * el admin está en su propia terminal que está pending. No puede entrar al
 * POS porque la terminal no está aprobada, pero necesita entrar al POS
 * para aprobar la terminal.
 *
 * Solución: el admin mete su PIN acá. El server:
 *   1. Verifica que el PIN corresponda a un user con role=admin.
 *   2. Verifica que la terminal del serial enviado esté pending (no se puede
 *      re-aprobar algo revoked/active).
 *   3. Aprueba la terminal y la liga a la licencia activa.
 *   4. Devuelve un authToken admin (para que el POS entre directo con sesión
 *      de admin y pueda ver Settings → Licencias).
 *
 * Este endpoint queda en /api/license/* y está exento del middleware
 * requireLicensedTerminal (ver LICENSE_EXEMPT_PATHS en server.js).
 */
app.post("/api/license/admin-self-approve", async (req, res) => {
  try {
    const pin = String(req.body?.pin || "").trim();
    const serial = String(req.body?.serial || "").trim();

    if (!/^\d{4,}$/.test(pin)) {
      return res.status(400).json({ error: "PIN inválido (debe ser numérico, 4+ dígitos)" });
    }
    if (!serial || serial.length < 8) {
      return res.status(400).json({ error: "Serial inválido" });
    }

    // 1) Verificar que el PIN sea de un admin
    const [userRows] = await query(
      `SELECT id, full_name, role, operation_center_id
       FROM staff_users WHERE pin_code = ? LIMIT 1`,
      [pin],
    );
    if (!userRows.length) {
      return res.status(403).json({ error: "PIN inválido" });
    }
    const user = userRows[0];
    if (String(user.role || "") !== "admin") {
      return res.status(403).json({ error: "Solo un admin puede auto-aprobar una terminal" });
    }

    // 2) Verificar que la terminal exista y esté pending
    const [termRows] = await query(
      `SELECT id, status, license_id FROM licensed_terminals WHERE serial = ? LIMIT 1`,
      [serial],
    );
    if (!termRows.length) {
      return res.status(404).json({ error: "Terminal no encontrada. ¿Se registró primero?" });
    }
    const terminal = termRows[0];
    if (terminal.status === "active") {
      return res.status(409).json({ error: "La terminal ya está activa. Recargá el POS." });
    }
    if (terminal.status === "revoked") {
      return res.status(403).json({ error: "La terminal fue revocada. No se puede auto-aprobar." });
    }

    // 3) Buscar o crear licencia activa
    let licenseId = terminal.license_id;
    if (!licenseId) {
      const [licRows] = await query(
        `SELECT id FROM licenses WHERE status = 'active' ORDER BY id ASC LIMIT 1`,
      );
      if (licRows[0]) {
        licenseId = licRows[0].id;
      } else {
        // Crear trial automáticamente para no bloquear el bootstrap
        const [ins] = await query(
          `INSERT INTO licenses (tier, max_terminals, valid_from, valid_until, offline_grace_days, status, notes)
           VALUES ('standard', 0, NOW(), NULL, 7, 'active', 'Auto-creada en admin self-approve')`,
        );
        licenseId = ins.insertId;
      }
    }

    // 4) Aprobar la terminal
    await query(
      `UPDATE licensed_terminals
       SET status = 'active',
           license_id = ?,
           approved_at = NOW(),
           approved_by_user_id = ?
       WHERE id = ?`,
      [licenseId, user.id, terminal.id],
    );
    // 5) Audit log
    await query(
      `INSERT INTO license_audit (actor_user_id, terminal_id, license_id, action, details)
       VALUES (?, ?, ?, 'terminal.approve', ?)`,
      [user.id, terminal.id, licenseId, JSON.stringify({ via: 'admin-self-approve' })],
    );

    // 6) Crear sesión de auth para el admin (sin pasar por pin-login)
    const ip = clientIp(req);
    const authToken = await createAuthSession(user, {
      ip,
      userAgent: req.headers["user-agent"],
    });
    const allowedModules = await getAllowedModulesForContext(user, ip);

    return res.json({
      ok: true,
      user,
      allowedModules,
      authToken,
      terminal: { id: terminal.id, status: "active" },
      message: "Terminal aprobada y sesión de admin creada",
    });
  } catch (e) {
    console.error("[license.admin-self-approve]", e);
    return res.status(500).json({ error: "Error aprobando la terminal" });
  }
});

/**
 * POST /api/auth/logout
 * Borra la sesión actual (de DB y del cache en memoria).
 * No falla si el token no existe — el logout es idempotente.
 */
app.post("/api/auth/logout", async (req, res) => {
  const token = String(req.headers["x-auth-token"] || "").trim();
  if (token) {
    await deleteAuthSession(token);
  }
  res.json({ ok: true });
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
    `SELECT id, name, is_active, sort_order, color, operation_center_id
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
    `SELECT su.id, su.full_name, su.role, su.pin_code, su.operation_center_id,
            GROUP_CONCAT(DISTINCT r.name SEPARATOR ', ') AS role_names
     FROM staff_users su
     LEFT JOIN user_roles ur ON ur.user_id = su.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY su.id
     ORDER BY su.full_name`
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
    roles,
    permissions,
    permByRole,
    rolesByUser,
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

app.get("/api/settings/tip-excluded-methods", async (_req, res) => {
  try {
    const [rows] = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'tip_excluded_methods' LIMIT 1`
    );
    const methods = rows?.[0]?.setting_value || 'cxc';
    res.json({ excludedMethods: methods.split(',').map(s => s.trim()).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/settings/tip-excluded-methods", async (req, res) => {
  try {
    const { excludedMethods = 'cxc' } = req.body || {};
    const value = Array.isArray(excludedMethods) ? excludedMethods.join(',') : String(excludedMethods);
    await query(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES ('tip_excluded_methods', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [value]
    );
    res.json({ ok: true, excludedMethods: value.split(',').map(s => s.trim()).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// Roles & Permissions API
app.get("/api/settings/roles", async (_req, res) => {
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
  res.json({ roles, permissions, permByRole, rolesByUser });
});

app.post("/api/settings/roles", async (req, res) => {
  const { name, slug, description } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: "name y slug son requeridos" });
  const cleanSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!cleanSlug) return res.status(400).json({ error: "slug invalido" });
  try {
    const [r] = await query(
      `INSERT INTO roles (name, slug, description) VALUES (?, ?, ?)`,
      [String(name).trim(), cleanSlug, String(description || '').trim()]
    );
    res.status(201).json({ id: r.insertId, name: String(name).trim(), slug: cleanSlug });
  } catch (e) {
    if (String(e.message || '').includes('Duplicate')) {
      return res.status(409).json({ error: "Ya existe un rol con ese slug" });
    }
    throw e;
  }
});

app.put("/api/settings/roles/:roleId", async (req, res) => {
  const roleId = Number(req.params.roleId);
  const { name, description } = req.body || {};
  if (!roleId || !name) return res.status(400).json({ error: "roleId y name son requeridos" });
  const [existing] = await query(`SELECT is_system FROM roles WHERE id = ? LIMIT 1`, [roleId]);
  if (!existing.length) return res.status(404).json({ error: "Rol no encontrado" });
  await query(
    `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
    [String(name).trim(), String(description || '').trim(), roleId]
  );
  res.json({ ok: true });
});

app.delete("/api/settings/roles/:roleId", async (req, res) => {
  const roleId = Number(req.params.roleId);
  if (!roleId) return res.status(400).json({ error: "roleId es requerido" });
  const [existing] = await query(`SELECT is_system FROM roles WHERE id = ? LIMIT 1`, [roleId]);
  if (!existing.length) return res.status(404).json({ error: "Rol no encontrado" });
  if (Number(existing[0].is_system)) return res.status(400).json({ error: "No se puede eliminar un rol del sistema" });
  await query(`DELETE FROM user_roles WHERE role_id = ?`, [roleId]);
  await query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
  await query(`DELETE FROM roles WHERE id = ?`, [roleId]);
  res.json({ ok: true });
});

app.post("/api/settings/roles/:roleId/permissions", async (req, res) => {
  const roleId = Number(req.params.roleId);
  const { permissionIds } = req.body || {};
  if (!roleId || !Array.isArray(permissionIds)) {
    return res.status(400).json({ error: "roleId y permissionIds son requeridos" });
  }
  const [existing] = await query(`SELECT id FROM roles WHERE id = ? LIMIT 1`, [roleId]);
  if (!existing.length) return res.status(404).json({ error: "Rol no encontrado" });
  await query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
  for (const pid of permissionIds) {
    await query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
      [roleId, Number(pid)]
    );
  }
  res.json({ ok: true });
});

app.post("/api/settings/users/:userId/roles", async (req, res) => {
  const userId = Number(req.params.userId);
  const { roleIds } = req.body || {};
  if (!userId || !Array.isArray(roleIds)) {
    return res.status(400).json({ error: "userId y roleIds son requeridos" });
  }
  const [userRows] = await query(`SELECT id FROM staff_users WHERE id = ? LIMIT 1`, [userId]);
  if (!userRows.length) return res.status(404).json({ error: "Usuario no encontrado" });
  await query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
  for (const rid of roleIds) {
    await query(
      `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [userId, Number(rid)]
    );
  }
  res.json({ ok: true });
});

// Endpoint to refresh session permissions (after role/permission changes)
app.post("/api/auth/refresh-session", async (req, res) => {
  const session = await getAuthSession(req);
  if (!session) return res.status(401).json({ error: "Sesion invalida" });
  let permissions = [];
  try {
    permissions = await getUserPermissions(session.userId);
  } catch (_) {}
  session.permissions = permissions;
  res.json({ ok: true, permissions });
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
  const { name, isActive = 1, sortOrder = 0, color = '#6366f1', centerId = null } = req.body || {};
  if (!name) return res.status(400).json({ error: "name es requerido" });
  try {
    const [result] = await query(
      `INSERT INTO product_categories (name, is_active, sort_order, color, operation_center_id)
       VALUES (?, ?, ?, ?, ?)`,
      [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, String(color || '#6366f1').trim(), centerId ? Number(centerId) : null]
    );
    res.status(201).json({ categoryId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/categories/:categoryId", async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const { name, isActive = 1, sortOrder = 0, color = '#6366f1', centerId = null } = req.body || {};
  if (!categoryId || !name) return res.status(400).json({ error: "categoryId y name son requeridos" });
  try {
    await query(
      `UPDATE product_categories
       SET name = ?, is_active = ?, sort_order = ?, color = ?, operation_center_id = ?
       WHERE id = ?`,
      [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, String(color || '#6366f1').trim(), centerId ? Number(centerId) : null, categoryId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: err.message });
  }
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
  const { name, printerName = '', printerIp = '', printerPort = 9100, isActive = 1, operationCenterId = null } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "name es requerido" });
  }
  try {
    const [result] = await query(
      `INSERT INTO production_centers (name, printer_name, printer_ip, printer_port, is_active, operation_center_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        String(printerName).trim(),
        printerIp ? String(printerIp).trim() : null,
        Number(printerPort) || 9100,
        Number(isActive) ? 1 : 0,
        operationCenterId ? Number(operationCenterId) : null,
      ]
    );
    res.status(201).json({ centerId: result.insertId });
  } catch (err) {
    console.error('Error creating production center:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/production-centers/:centerId", async (req, res) => {
  const centerId = Number(req.params.centerId);
  const { name, printerName = '', printerIp = '', printerPort = 9100, isActive = 1, operationCenterId = null } = req.body || {};
  if (!centerId || !name) {
    return res.status(400).json({ error: "centerId y name son requeridos" });
  }
  try {
    await query(
      `UPDATE production_centers
       SET name = ?, printer_name = ?, printer_ip = ?, printer_port = ?, is_active = ?, operation_center_id = ?
       WHERE id = ?`,
      [
        String(name).trim(),
        String(printerName).trim(),
        printerIp ? String(printerIp).trim() : null,
        Number(printerPort) || 9100,
        Number(isActive) ? 1 : 0,
        operationCenterId ? Number(operationCenterId) : null,
        centerId,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating production center:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete production center
app.delete("/api/settings/production-centers/:centerId", async (req, res) => {
  const centerId = Number(req.params.centerId);
  if (!centerId) {
    return res.status(400).json({ error: "centerId es requerido" });
  }
  try {
    // Check if center is being used by any product
    const [usage] = await query(
      `SELECT COUNT(*) as cnt FROM product_production_centers WHERE center_id = ?`,
      [centerId]
    );
    
    if (Number(usage[0].cnt) > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar el centro porque hay productos asignados. Desasigna los productos primero." 
      });
    }
    
    await query(`DELETE FROM production_centers WHERE id = ?`, [centerId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting production center:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all production centers
app.get("/api/settings/production-centers", async (req, res) => {
  try {
    const [centers] = await query(
      `SELECT id, name, printer_name, printer_ip, printer_port, is_active, operation_center_id
       FROM production_centers
       ORDER BY id`
    );
    res.json({ centers });
  } catch (err) {
    console.error('Error fetching production centers:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test print endpoint: manda una pagina de prueba a la impresora
// de un production center o de una terminal. Util para diagnosticar
// la conexion sin esperar a una operacion real.
app.post("/api/settings/printers/test", async (req, res) => {
  const { type, id } = req.body || {};
  if (!type || !id) {
    return res.status(400).json({ error: "type y id son requeridos (type: 'production_center' | 'terminal')" });
  }
  let target = null;
  try {
    if (type === "production_center") {
      const [rows] = await query(
        `SELECT id, name AS printer_name, printer_name AS name, printer_ip, printer_port
         FROM production_centers WHERE id = ? LIMIT 1`,
        [Number(id)]
      );
      target = rows?.[0] || null;
    } else if (type === "terminal") {
      const [rows] = await query(
        `SELECT id, name AS printer_name, printer_name AS name, printer_ip, printer_port
         FROM terminals WHERE id = ? LIMIT 1`,
        [Number(id)]
      );
      target = rows?.[0] || null;
    } else {
      return res.status(400).json({ error: "type invalido" });
    }
    if (!target) return res.status(404).json({ error: "Destino no encontrado" });
    if (!target.printer_ip) {
      return res.status(400).json({ error: "Esta impresora no tiene IP configurada. Configurala primero." });
    }
    const result = await printService.printTestPage(target);
    if (result.ok) {
      res.json({ ok: true, message: "Pagina de prueba enviada", attempts: result.attempts });
    } else {
      res.status(500).json({ ok: false, error: result.error || "No se pudo imprimir" });
    }
  } catch (err) {
    console.error("Error en test print:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Diagnostico del servicio de impresion
app.get("/api/settings/printers/status", async (_req, res) => {
  res.json(printService.getStatus());
});

// Ultimos N jobs de impresion (para mostrar en Settings y reportes)
app.get("/api/settings/printers/recent", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  try {
    const [jobs] = await query(
      `SELECT id, printer_target, printer_ip, printer_port, job_type, account_id,
              status, attempts, error_message, created_at, completed_at
       FROM print_jobs
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

async function checkDuplicatePin(pinCode, excludeUserId) {
  if (!pinCode) return false;
  const [rows] = await query(
    `SELECT id FROM staff_users WHERE pin_code = ? AND (? IS NULL OR id != ?) LIMIT 1`,
    [String(pinCode).trim(), excludeUserId || null, excludeUserId || null]
  );
  return rows.length > 0;
}

app.post("/api/settings/staff-users", async (req, res) => {
  const { fullName, pinCode, role = 'waiter', operationCenterId = null } = req.body || {};
  if (!fullName || !pinCode) {
    return res.status(400).json({ error: "fullName y pinCode son requeridos" });
  }
  if (await checkDuplicatePin(pinCode)) {
    return res.status(409).json({ error: "Ya existe un usuario con ese PIN" });
  }
  const [result] = await query(
    `INSERT INTO staff_users (full_name, pin_code, role, operation_center_id) VALUES (?, ?, ?, ?)`,
    [String(fullName).trim(), String(pinCode).trim(), role, operationCenterId ? Number(operationCenterId) : null]
  );
  res.status(201).json({ userId: result.insertId });
});

app.put("/api/settings/staff-users/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const { fullName, pinCode, role, operationCenterId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId es requerido" });
  if (!fullName) return res.status(400).json({ error: "fullName es requerido" });
  if (pinCode && await checkDuplicatePin(pinCode, userId)) {
    return res.status(409).json({ error: "Ya existe otro usuario con ese PIN" });
  }
  const fields = [];
  const params = [];
  if (fullName) { fields.push('full_name = ?'); params.push(String(fullName).trim()); }
  if (pinCode) { fields.push('pin_code = ?'); params.push(String(pinCode).trim()); }
  if (role) { fields.push('role = ?'); params.push(role); }
  if (operationCenterId !== undefined) { fields.push('operation_center_id = ?'); params.push(operationCenterId ? Number(operationCenterId) : null); }
  if (!fields.length) return res.status(400).json({ error: "Sin datos para actualizar" });
  params.push(userId);
  await query(`UPDATE staff_users SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ ok: true });
});

app.delete("/api/settings/staff-users/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "userId es requerido" });
  await query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM user_module_permissions WHERE user_id = ?`, [userId]);
  await query(`DELETE FROM staff_users WHERE id = ?`, [userId]);
  res.json({ ok: true });
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
    // Filter by production centers that belong to this operation center.
    // Un centro de producción SIN operation_center_id (NULL) se trata como
    // GLOBAL/compartido: sus productos se ven en TODOS los centros.
    centerFilter = `
      AND EXISTS (
        SELECT 1 FROM product_production_centers ppc
        INNER JOIN production_centers prc ON prc.id = ppc.center_id
        WHERE ppc.product_id = p.id
          AND (prc.operation_center_id = ? OR prc.operation_center_id IS NULL)
      )`;
    centerParams = [centerId];
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
  const centerId = Number(req.query.centerId || "0");
  let centerFilter = "";
  let centerParams = [];
  if (centerId > 0) {
    // Only show categories that have products with production centers in this
    // operation center. Centros de producción NULL = globales (todas las sedes).
    centerFilter = `
      AND EXISTS (
        SELECT 1 FROM products p
        INNER JOIN product_production_centers ppc ON ppc.product_id = p.id
        INNER JOIN production_centers prc ON prc.id = ppc.center_id
        WHERE p.category_id = product_categories.id 
          AND p.is_active = 1 
          AND (prc.operation_center_id = ? OR prc.operation_center_id IS NULL)
      )`;
    centerParams = [centerId];
  }
  const [rows] = await query(
    `SELECT id, name, color
     FROM product_categories
     WHERE is_active = 1
     ${centerFilter}
     ORDER BY sort_order, name`,
    centerParams
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
  res.json({ products, categories, areas, centers, tables, productionCenters, productProductionCenters, groups, options, productModifierGroups, staffUsers, roles, permissions, permByRole, rolesByUser });
});

// Search paid accounts by check number (optional) + optional date range
app.get("/api/accounts/paid/search", async (req, res) => {
  try {
    const { q, centerId, startDate, endDate } = req.query;
    if (!centerId) return res.status(400).json({ error: "centerId es requerido" });
    let conditions = ['t.operation_center_id = ?', "a.status = 'paid'"];
    let params = [Number(centerId)];
    if (q && q.trim()) {
      conditions.push('a.check_number LIKE ?');
      params.push(`%${q.trim()}%`);
    }
    if (startDate) {
      conditions.push('a.closed_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('a.closed_at <= ?');
      params.push(endDate + ' 23:59:59');
    }
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.status, a.guest_count, a.closed_at, a.table_id, t.code AS table_code,
              u.full_name AS waiter_name, oc.name AS center_name,
              (SELECT COALESCE(SUM(oi.line_total), 0) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS total
       FROM accounts a
       INNER JOIN staff_users u ON u.id = a.waiter_id
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN operation_centers oc ON oc.id = t.operation_center_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.closed_at DESC
       LIMIT 20`,
      params
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Full receipt data for reprint (account + items + payments + totals)
app.get("/api/accounts/:accountId/receipt", async (req, res) => {
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

    const [items] = await query(
      `SELECT oi.*, p.name AS product_name
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id = ? AND oi.status = 'active'
       ORDER BY oi.created_at`,
      [accountId]
    );

    const [payments] = await query(
      `SELECT pm.label AS method_label, p.method, p.amount, p.reference_no, p.created_at
       FROM account_payments p
       LEFT JOIN payment_methods pm ON pm.code = p.method
       WHERE p.account_id = ?
       ORDER BY p.created_at`,
      [accountId]
    );

    const totals = await getAccountTotals(accountId);
    res.json({ account: accountRows[0], items, payments, totals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
  let accountJustClosed = false;
  if (Number(totals.pending || 0) <= 0) {
    const [accountRows] = await query(`SELECT status FROM accounts WHERE id = ? LIMIT 1`, [accountId]);
    const status = String(accountRows?.[0]?.status || "");
    if (status === "open") {
      await query(`UPDATE accounts SET status = 'paid', closed_at = ? WHERE id = ?`, [nowSql(), accountId]);
      await addAccountEvent(accountId, "account_closed_auto", totals, null);
      accountJustClosed = true;
    }
  }

  // ───────── Imprimir recibo del cliente (fire-and-forget) ─────────
  // Si este pago completó la cuenta, disparamos la impresión del recibo.
  // Si falla, el cajero puede reimprimir desde /reprint.
  if (accountJustClosed) {
    try {
      const terminal = await resolveTerminalForRequest(req);
      if (terminal?.printer_ip) {
        const [receiptRows] = await query(
          `SELECT a.id, a.check_number, a.waiter_id, a.table_id,
                  t.code AS table_code,
                  u.full_name AS waiter_name
           FROM accounts a
           INNER JOIN restaurant_tables t ON t.id = a.table_id
           INNER JOIN staff_users u ON u.id = a.waiter_id
           WHERE a.id = ? LIMIT 1`,
          [accountId]
        );
        const [items] = await query(
          `SELECT oi.qty, oi.line_total, p.name AS product_name
           FROM order_items oi
           INNER JOIN products p ON p.id = oi.product_id
           WHERE oi.account_id = ? AND oi.status = 'active'
           ORDER BY oi.id`,
          [accountId]
        );
        const [payments] = await query(
          `SELECT pm.label AS method_label, p.method, p.amount
           FROM account_payments p
           LEFT JOIN payment_methods pm ON pm.code = p.method
           WHERE p.account_id = ? ORDER BY p.id`,
          [accountId]
        );
        const [restaurantRows] = await query(
          `SELECT setting_value AS name FROM app_settings WHERE setting_key = 'restaurant_name' LIMIT 1`
        ).catch(() => [[]]);
        const restaurant = { name: restaurantRows?.[0]?.name || "RESTAURANTE" };
        const receipt = { account: receiptRows[0], items, payments, totals };
        printService
          .printCustomerReceipt(receipt, terminal, restaurant)
          .then((result) => {
            if (!result.ok && !result.skipped) {
              console.warn(
                `[PRINT] Fallo imprimiendo recibo cuenta ${receiptRows[0]?.check_number}: ${result.error}`
              );
            }
          })
          .catch((e) => console.error(`[PRINT] Excepcion imprimiendo recibo: ${e.message}`));
      }
    } catch (printErr) {
      console.error(`[PRINT] Error preparando recibo: ${printErr.message}`);
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
    `SELECT a.id, a.check_number, a.status, a.waiter_id,
            t.code AS table_code,
            u.full_name AS waiter_name,
            oc.id AS center_id, oc.name AS center_name
     FROM accounts a
     INNER JOIN restaurant_tables t ON t.id = a.table_id
     INNER JOIN staff_users u ON u.id = a.waiter_id
     LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
     WHERE a.id = ?`,
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

  // ───────── Imprimir tickets de cocina (fire-and-forget) ─────────
  // Por cada ticket (uno por centro de producción) buscamos la config de
  // impresora del centro y disparamos la impresión. Si falla, la cocina
  // usa el KDS como respaldo; el fallo queda en print_jobs.
  const accountMeta = {
    id: accountId,
    check_number: rows[0].check_number,
    table_code: rows[0].table_code,
    waiter_name: rows[0].waiter_name,
  };
  for (const ticket of tickets) {
    if (!ticket.centerId) continue; // sin centro, no hay impresora destino
    try {
      const [centerRows] = await query(
        `SELECT id, name, printer_name, printer_ip, printer_port
         FROM production_centers WHERE id = ? LIMIT 1`,
        [ticket.centerId]
      );
      const center = centerRows[0];
      if (!center) continue;
      // Fire-and-forget: NO await. La respuesta al cliente no espera la impresión.
      printService
        .printKitchenTicket(ticket, center, accountMeta)
        .then((result) => {
          if (!result.ok && !result.skipped) {
            console.warn(
              `[PRINT] Fallo imprimiendo comanda ${ticket.centerName} cuenta ${accountMeta.check_number}: ${result.error}`
            );
          }
        })
        .catch((e) => {
          console.error(`[PRINT] Excepcion imprimiendo comanda: ${e.message}`);
        });
    } catch (lookupErr) {
      console.error(`[PRINT] Error buscando centro ${ticket.centerId}: ${lookupErr.message}`);
    }
  }

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

// Cuenta compartida - cada persona paga lo mismo con los mismos productos fraccionados
app.post("/api/accounts/:accountId/split-shared", async (req, res) => {
  const sourceAccountId = Number(req.params.accountId);
  const { peopleCount } = req.body || {};

  if (!sourceAccountId || !peopleCount || peopleCount < 2) {
    return res.status(400).json({ error: "peopleCount debe ser al menos 2" });
  }

  const [srcRows] = await query(
    `SELECT id, table_id, waiter_id, operation_center_id, guest_count, status
     FROM accounts WHERE id = ? LIMIT 1`,
    [sourceAccountId]
  );
  if (!srcRows.length) return res.status(404).json({ error: "Cuenta origen no encontrada" });
  if (String(srcRows[0].status) !== "open") return res.status(400).json({ error: "Cuenta origen no está abierta" });

  const { table_id, waiter_id, operation_center_id } = srcRows[0];

  const [items] = await query(
    `SELECT * FROM order_items WHERE account_id = ? AND status = 'active' ORDER BY id`,
    [sourceAccountId]
  );

  if (!items.length) {
    return res.status(400).json({ error: "La cuenta no tiene productos" });
  }

  const [openShift] = await query(
    `SELECT id FROM shifts WHERE status = 'open' AND operation_center_id = ? ORDER BY id DESC LIMIT 1`,
    [operation_center_id]
  );
  const shiftId = openShift.length ? openShift[0].id : null;

  const fractionalQty = 1 / peopleCount;

  const results = [];

  for (let i = 0; i < peopleCount; i++) {
    const tempCheckNumber = `TMP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const [insertResult] = await query(
      `INSERT INTO accounts (table_id, operation_center_id, waiter_id, shift_id, status, guest_count, check_number, opened_at)
       VALUES (?, ?, ?, ?, 'open', 1, ?, ?)`,
      [table_id, operation_center_id, waiter_id, shiftId, tempCheckNumber, nowSql()]
    );
    const newAccountId = Number(insertResult.insertId);
    const checkNumber = `CHK-${String(newAccountId).padStart(4, "0")}`;
    await query(`UPDATE accounts SET check_number = ? WHERE id = ?`, [checkNumber, newAccountId]);

    // Insert all items with 1/n quantity and 1/n price
    for (const item of items) {
      const unitPrice = Number(item.unit_price) || 0;
      const fractionalTotal = Number((unitPrice * fractionalQty).toFixed(2));

      await query(
        `INSERT INTO order_items (account_id, product_id, seat_no, qty, unit_price, line_total, notes, sent_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newAccountId,
          Number(item.product_id),
          Number(item.seat_no || 1),
          fractionalQty,
          unitPrice,
          fractionalTotal,
          item.notes || "",
          item.sent_at || null,
          nowSql(),
        ]
      );
    }

    await addAccountEvent(newAccountId, "account_opened", { source: sourceAccountId, shared: true, peopleCount }, waiter_id);
    results.push({
      accountId: newAccountId,
      checkNumber,
      name: `Persona ${i + 1}`,
    });
  }

  // Close the source account
  await query(
    `UPDATE accounts SET status = 'shared_split', closed_at = ? WHERE id = ?`,
    [nowSql(), sourceAccountId]
  );
  await addAccountEvent(sourceAccountId, "account_shared", { peopleCount, newAccounts: results.length }, null);

  res.json({ ok: true, peopleCount, accounts: results });
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

  // Marcar la cuenta origen como void Y guardar a cuál cuenta se unió
  await query(
    `UPDATE accounts SET status = 'void', merged_into_account_id = ? WHERE id = ?`,
    [targetAccountId, sourceAccountId]
  );
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

// =============================================
// KDS - Kitchen Display System Endpoints
// =============================================

// Get all active orders for KDS (sent items not yet done)
app.get("/api/kds/orders", async (req, res) => {
  const { centerId } = req.query;
  
  // Get all sent, active items from open accounts (without completed_at filter to avoid column issues)
  let whereClause = `a.status = 'open' AND oi.status = 'active' AND oi.sent_at IS NOT NULL`;
  let params = [];
  
  if (centerId) {
    whereClause += ` AND pc.id = ?`;
    params.push(Number(centerId));
  }
  
  const [items] = await query(
    `SELECT 
      oi.id AS item_id,
      oi.qty,
      oi.seat_no,
      oi.notes,
      oi.created_at,
      oi.sent_at,
      oi.completed_at,
      p.name AS product_name,
      pc.id AS center_id,
      pc.name AS center_name,
      a.id AS account_id,
      a.check_number,
      rt.code AS table_code,
      su.full_name AS waiter_name,
      a.guest_count
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN restaurant_tables rt ON rt.id = a.table_id
     INNER JOIN staff_users su ON su.id = a.waiter_id
     LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
     LEFT JOIN production_centers pc ON pc.id = ppc.center_id
     WHERE ${whereClause}
     ORDER BY pc.name, oi.sent_at ASC`,
    params
  );
  
  // Filter out completed items in JS (safer than column check)
  const activeItems = items.filter(i => !i.completed_at);
  
  // Get modifiers for each item
  if (!activeItems.length) {
    return res.json({ orders: [], categories: [] });
  }
  
  const itemIds = activeItems.map(i => Number(i.item_id));
  const [mods] = await query(
    `SELECT oim.item_id, mo.name 
     FROM order_item_modifiers oim
     INNER JOIN modifier_options mo ON mo.id = oim.option_id
     WHERE oim.item_id IN (${itemIds.map(() => '?').join(',')})`,
    itemIds
  );
  
  const modsByItem = mods.reduce((acc, m) => {
    const key = Number(m.item_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m.name);
    return acc;
  }, {});
  
  // Group items by account + table
  const ticketsMap = new Map();
  const categoryCounts = {};
  
  for (const item of items) {
    const key = `A-${item.account_id}`;
    const centerName = item.center_name || 'Restaurante';
    
    // Count by category
    categoryCounts[centerName] = (categoryCounts[centerName] || 0) + Number(item.qty);
    
    if (!ticketsMap.has(key)) {
      ticketsMap.set(key, {
        accountId: Number(item.account_id),
        checkNumber: item.check_number,
        tableCode: item.table_code,
        waiterName: item.waiter_name,
        guestCount: item.guest_count,
        centerName,
        sentAt: item.sent_at,
        items: []
      });
    }
    
    ticketsMap.get(key).items.push({
      itemId: Number(item.item_id),
      productName: item.product_name,
      qty: Number(item.qty),
      seatNo: Number(item.seat_no),
      notes: item.notes || '',
      modifiers: modsByItem[Number(item.item_id)] || [],
      sentAt: item.sent_at
    });
  }
  
  const tickets = [...ticketsMap.values()];
  
  // Build categories list
  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count
  }));
  
  res.json({ orders: tickets, categories });
});

// Get orders WITH voided items included (for KDS display)
app.get("/api/kds/orders-with-voided", async (req, res) => {
  const { centerId } = req.query;
  
  // Get all sent items (active and voided) from open accounts
  let whereClause = `a.status = 'open' AND oi.sent_at IS NOT NULL AND (oi.status = 'active' OR oi.status = 'void')`;
  let params = [];
  
  if (centerId) {
    whereClause += ` AND pc.id = ?`;
    params.push(Number(centerId));
  }
  
  const [items] = await query(
    `SELECT 
      oi.id AS item_id,
      oi.qty,
      oi.seat_no,
      oi.notes,
      oi.created_at,
      oi.sent_at,
      oi.status AS item_status,
      oi.void_reason,
      oi.voided_at,
      COALESCE(oi.completed_at, 'null') AS completed_at,
      p.name AS product_name,
      pc.id AS center_id,
      pc.name AS center_name,
      a.id AS account_id,
      a.check_number,
      rt.code AS table_code,
      su.full_name AS waiter_name,
      a.guest_count,
      c.name AS category_name
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN restaurant_tables rt ON rt.id = a.table_id
     INNER JOIN staff_users su ON su.id = a.waiter_id
     INNER JOIN product_categories c ON c.id = p.category_id
     LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
     LEFT JOIN production_centers pc ON pc.id = ppc.center_id
     WHERE ${whereClause}
     ORDER BY pc.name, oi.sent_at ASC`,
    params
  );
  
  // Get modifiers for each item
  if (!items.length) {
    return res.json({ orders: [], categories: [] });
  }
  
  const itemIds = items.map(i => Number(i.item_id));
  const [mods] = await query(
    `SELECT oim.item_id, mo.name 
     FROM order_item_modifiers oim
     INNER JOIN modifier_options mo ON mo.id = oim.option_id
     WHERE oim.item_id IN (${itemIds.map(() => '?').join(',')})`,
    itemIds
  );
  
  const modsByItem = mods.reduce((acc, m) => {
    const key = Number(m.item_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push(m.name);
    return acc;
  }, {});
  
  // Group items by account + table
  const ticketsMap = new Map();
  const categoryCounts = {};
  
  for (const item of items) {
    const key = `A-${item.account_id}`;
    const centerName = item.center_name || 'Restaurante';
    
    // Count only active items by category
    if (item.item_status === 'active') {
      categoryCounts[centerName] = (categoryCounts[centerName] || 0) + Number(item.qty);
    }
    
    if (!ticketsMap.has(key)) {
      ticketsMap.set(key, {
        accountId: Number(item.account_id),
        checkNumber: item.check_number,
        tableCode: item.table_code,
        waiterName: item.waiter_name,
        guestCount: item.guest_count,
        centerName,
        sentAt: item.sent_at,
        items: []
      });
    }
    
    const isCompleted = item.item_status === 'active' && item.completed_at && item.completed_at !== 'null';
    
    ticketsMap.get(key).items.push({
      itemId: Number(item.item_id),
      productName: item.product_name,
      qty: Number(item.qty),
      seatNo: Number(item.seat_no),
      notes: item.notes || '',
      modifiers: modsByItem[Number(item.item_id)] || [],
      sentAt: item.sent_at,
      voided: item.item_status === 'void',
      voidReason: item.void_reason || '',
      voidedAt: item.voided_at,
      completed: isCompleted,
      categoryName: item.category_name || 'Otros',
      centerId: Number(item.center_id) || null,
      centerName: item.center_name || 'Restaurante'
    });
  }
  
  const tickets = [...ticketsMap.values()];
  
  // Build categories list
  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count
  }));
  
  res.json({ orders: tickets, categories });
});

// Mark item as done (completed)
app.post("/api/kds/items/:itemId/done", async (req, res) => {
  const itemId = Number(req.params.itemId);
  
  const [rows] = await query(
    `SELECT id, account_id, status FROM order_items WHERE id = ?`,
    [itemId]
  );
  
  if (!rows.length) return res.status(404).json({ error: "Item no encontrado" });
  if (rows[0].status !== 'active') return res.status(400).json({ error: "El item no esta activo" });
  
  await query(
    `UPDATE order_items SET completed_at = ? WHERE id = ?`,
    [nowSql(), itemId]
  );
  
  await addAccountEvent(rows[0].account_id, "kds_item_done", { itemId }, null);
  
  res.json({ ok: true });
});

// Mark all items for an account as done
app.post("/api/kds/accounts/:accountId/done-all", async (req, res) => {
  const accountId = Number(req.params.accountId);
  
  const [result] = await query(
    `UPDATE order_items 
     SET completed_at = ? 
     WHERE account_id = ? AND status = 'active' AND sent_at IS NOT NULL AND completed_at IS NULL`,
    [nowSql(), accountId]
  );
  
  await addAccountEvent(accountId, "kds_all_done", { affectedRows: result.affectedRows }, null);
  
  res.json({ ok: true, affectedRows: result.affectedRows });
});

// Get completed items (history)
app.get("/api/kds/completed", async (req, res) => {
  const { centerId, limit = 50 } = req.query;
  
  let whereClause = `a.status = 'open' AND oi.status = 'active' AND oi.completed_at IS NOT NULL`;
  let params = [Number(limit)];
  
  if (centerId) {
    whereClause += ` AND pc.id = ?`;
    params.unshift(Number(centerId));
  }
  
  const [items] = await query(
    `SELECT 
      oi.id AS item_id,
      oi.qty,
      oi.seat_no,
      oi.notes,
      oi.sent_at,
      oi.completed_at,
      p.name AS product_name,
      pc.name AS center_name,
      a.id AS account_id,
      a.check_number,
      rt.code AS table_code
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN restaurant_tables rt ON rt.id = a.table_id
     LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
     LEFT JOIN production_centers pc ON pc.id = ppc.center_id
     WHERE ${whereClause}
     ORDER BY oi.completed_at DESC
     LIMIT ?`,
    params
  );
  
  res.json({ items });
});

// Get voided items (for KDS visibility)
app.get("/api/kds/voided", async (req, res) => {
  const { centerId, limit = 20 } = req.query;
  
  let whereClause = `oi.status = 'void'`;
  let params = [Number(limit)];
  
  if (centerId) {
    whereClause += ` AND pc.id = ?`;
    params.unshift(Number(centerId));
  }
  
  const [items] = await query(
    `SELECT 
      oi.id AS item_id,
      oi.qty,
      oi.seat_no,
      oi.notes,
      oi.voided_at,
      oi.void_reason,
      p.name AS product_name,
      pc.name AS center_name,
      a.id AS account_id,
      a.check_number,
      rt.code AS table_code
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN restaurant_tables rt ON rt.id = a.table_id
     LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
     LEFT JOIN production_centers pc ON pc.id = ppc.center_id
     WHERE ${whereClause}
     ORDER BY oi.voided_at DESC
     LIMIT ?`,
    params
  );
  
  res.json({ items });
});

// Production Centers list
app.get("/api/kds/production-centers", async (req, res) => {
  const [centers] = await query(
    `SELECT id, name, printer_name, is_active, operation_center_id
     FROM production_centers
     WHERE is_active = 1
     ORDER BY id`
  );
  res.json({ centers });
});

// KDS Report: Get completed items with times
app.get("/api/kds/report", async (req, res) => {
  const { date, centerId, limit = 100 } = req.query;
  
  let dateFilter = '';
  let params = [];
  
  if (date) {
    dateFilter = ` AND DATE(oi.completed_at) = ?`;
    params.push(date);
  }
  
  let centerFilter = '';
  if (centerId) {
    centerFilter = ` AND pc.id = ?`;
    params.push(Number(centerId));
  }
  
  params.push(Number(limit));
  
  const [items] = await query(
    `SELECT
      oi.id AS item_id,
      oi.qty,
      oi.seat_no,
      oi.sent_at,
      oi.completed_at,
      p.name AS product_name,
      c.name AS category_name,
      pc.name AS center_name,
      a.id AS account_id,
      rt.code AS table_code,
      su.full_name AS waiter_name,
      TIMESTAMPDIFF(MINUTE, oi.sent_at, oi.completed_at) AS prep_time_minutes
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN restaurant_tables rt ON rt.id = a.table_id
     INNER JOIN staff_users su ON su.id = a.waiter_id
     INNER JOIN product_categories c ON c.id = p.category_id
     LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
     LEFT JOIN production_centers pc ON pc.id = ppc.center_id
     WHERE oi.status = 'active'
       AND oi.sent_at IS NOT NULL
       AND oi.completed_at IS NOT NULL
       ${dateFilter}
       ${centerFilter}
     ORDER BY oi.completed_at DESC
     LIMIT ?`,
    params
  );
  
  // Calculate stats
  const totalItems = items.length;
  const totalQty = items.reduce((sum, i) => sum + Number(i.qty), 0);
  const avgTime = totalItems > 0 
    ? Math.round(items.reduce((sum, i) => sum + Number(i.prep_time_minutes || 0), 0) / totalItems)
    : 0;
  const minTime = totalItems > 0 ? Math.min(...items.map(i => Number(i.prep_time_minutes || 0))) : 0;
  const maxTime = totalItems > 0 ? Math.max(...items.map(i => Number(i.prep_time_minutes || 0))) : 0;
  
  // Stats by category
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category_name || 'Otros';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, totalTime: 0 };
    }
    byCategory[cat].count += Number(item.qty);
    byCategory[cat].totalTime += Number(item.prep_time_minutes || 0);
  });
  
  const categoryStats = Object.entries(byCategory).map(([name, data]) => ({
    category: name,
    items: data.count,
    avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0
  })).sort((a, b) => b.items - a.items);
  
  res.json({
    items,
    stats: {
      totalItems,
      totalQty,
      avgTime,
      minTime,
      maxTime,
      byCategory: categoryStats
    }
  });
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
    const session = await getAuthSession(req);
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

app.get("/api/shifts/active", requireAuth, async (req, res) => {
  const { centerId } = req.query;
  if (!centerId) return res.status(400).json({ error: "centerId es requerido" });
  const [rows] = await query(
    `SELECT id, cashier_id, opened_at, opening_cash FROM shifts WHERE status = 'open' AND operation_center_id = ? ORDER BY id DESC LIMIT 1`,
    [Number(centerId)]
  );
  res.json({ active: rows.length > 0, shift: rows[0] || null });
});

app.post("/api/shifts/open", requireAuth, async (req, res) => {
  if (!hasPermission(req.session, 'shifts.open')) {
    return res.status(403).json({ error: "No tienes permiso para abrir turnos" });
  }
  const { cashierId, note = "", centerId, openingCash = 0 } = req.body || {};
  if (!cashierId || !centerId) return res.status(400).json({ error: "cashierId y centerId son requeridos" });

  const [openShift] = await query(`SELECT id FROM shifts WHERE status = 'open' AND operation_center_id = ? LIMIT 1`, [Number(centerId)]);
  if (openShift.length) return res.status(400).json({ error: "Ya existe un turno abierto en este centro" });

  const [result] = await query(
    `INSERT INTO shifts (cashier_id, operation_center_id, opened_at, opening_note, opening_cash, status) VALUES (?, ?, ?, ?, ?, 'open')`,
    [cashierId, Number(centerId), nowSql(), note, money(Number(openingCash))]
  );
  res.status(201).json({ shiftId: result.insertId });
});

async function getShiftSummary(shiftId, closingCash) {
  const [openShift] = await query(
    `SELECT id, opened_at, opening_cash FROM shifts WHERE id = ? LIMIT 1`,
    [shiftId]
  );
  if (!openShift.length) return null;
  const openingCash = money(Number(openShift[0].opening_cash || 0));

  const [summary] = await query(
    `SELECT
      COUNT(a.id) AS total_checks,
      COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END), 0) AS card_total,
      COALESCE(SUM(CASE WHEN p.method = 'transfer' THEN p.amount ELSE 0 END), 0) AS transfer_total,
      COALESCE(SUM(CASE WHEN p.method = 'cxc' THEN p.amount ELSE 0 END), 0) AS cxc_total,
      COALESCE(SUM(CASE WHEN p.method = 'other' THEN p.amount ELSE 0 END), 0) AS other_total,
      COALESCE(SUM(p.amount), 0) AS grand_total
     FROM accounts a
     LEFT JOIN account_payments p ON p.account_id = a.id
     WHERE a.shift_id = ?`,
    [shiftId]
  );

  const methodsMeta = await query(
    `SELECT code, label FROM payment_methods WHERE is_active = 1 ORDER BY sort_order`
  );
  const [methods] = methodsMeta;

  const [paymentsDetail] = await query(
    `SELECT p.method, p.amount, p.reference_no, a.check_number, a.id AS account_id
     FROM account_payments p
     INNER JOIN accounts a ON a.id = p.account_id
     WHERE a.shift_id = ?
     ORDER BY p.method, a.check_number`,
    [shiftId]
  );

  const [voidedItems] = await query(
    `SELECT oi.id, a.check_number, p.name AS product_name, oi.qty, oi.line_total, oi.void_reason, oi.voided_at
     FROM order_items oi
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN products p ON p.id = oi.product_id
     WHERE a.shift_id = ? AND oi.status = 'void'
     ORDER BY oi.voided_at`,
    [shiftId]
  );

  const [openAccounts] = await query(
    `SELECT a.id, a.check_number, a.guest_count, u.full_name AS waiter_name,
            COALESCE(SUM(oi.line_total), 0) AS total
     FROM accounts a
     LEFT JOIN order_items oi ON oi.account_id = a.id AND oi.status = 'active'
     LEFT JOIN staff_users u ON u.id = a.waiter_id
      WHERE a.shift_id = ? AND a.status = 'open'
      GROUP BY a.id
      ORDER BY a.check_number`,
    [shiftId]
  );

  const [paidAccounts] = await query(
    `SELECT a.id, a.check_number, a.guest_count, a.closed_at, u.full_name AS waiter_name,
            COALESCE(SUM(oi.line_total), 0) AS total,
            COALESCE((SELECT GROUP_CONCAT(DISTINCT p.method ORDER BY p.method SEPARATOR ', ') FROM account_payments p WHERE p.account_id = a.id), '') AS payment_methods
     FROM accounts a
     LEFT JOIN order_items oi ON oi.account_id = a.id AND oi.status = 'active'
     LEFT JOIN staff_users u ON u.id = a.waiter_id
     WHERE a.shift_id = ? AND a.status = 'paid'
     GROUP BY a.id
     ORDER BY a.check_number`,
    [shiftId]
  );

  const cashTotal = money(Number(summary[0].cash_total || 0));
  const expectedCash = money(openingCash + cashTotal);

  return {
    ...summary[0],
    openingCash,
    cashTotal,
    expectedCash,
    closingCash: closingCash !== null && closingCash !== undefined ? money(Number(closingCash)) : null,
    methods,
    paymentsDetail,
    voidedItems,
    openAccounts,
    paidAccounts,
  };
}

app.get("/api/shifts/preview", requireAuth, async (req, res) => {
  try {
    const { centerId, closingCash } = req.query;
    if (!centerId) return res.status(400).json({ error: "centerId es requerido" });
    const [openShift] = await query(
      `SELECT id, opened_at FROM shifts WHERE status = 'open' AND operation_center_id = ? ORDER BY id DESC LIMIT 1`,
      [Number(centerId)]
    );
    if (!openShift.length) return res.status(400).json({ error: "No hay turno abierto en este centro" });
    const summaryData = await getShiftSummary(openShift[0].id, closingCash !== undefined ? Number(closingCash) : null);
    res.json({ shiftId: openShift[0].id, openedAt: openShift[0].opened_at, summary: summaryData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/shifts/close", requireAuth, async (req, res) => {
  if (!hasPermission(req.session, 'shifts.close')) {
    return res.status(403).json({ error: "No tienes permiso para cerrar turnos" });
  }
  const { cashierId, note = "", centerId, closingCash = null } = req.body || {};
  if (!centerId) return res.status(400).json({ error: "centerId es requerido" });
  const [openShift] = await query(
    `SELECT id, opened_at, opening_cash FROM shifts WHERE status = 'open' AND operation_center_id = ? ORDER BY id DESC LIMIT 1`,
    [Number(centerId)]
  );
  if (!openShift.length) return res.status(400).json({ error: "No hay turno abierto en este centro" });
  const shiftId = openShift[0].id;

  const closeParams = [nowSql(), note, cashierId];
  let closeSql = `UPDATE shifts SET status = 'closed', closed_at = ?, closing_note = ?, cashier_id = ?`;
  if (closingCash !== null && closingCash !== undefined) {
    closeSql += `, closing_cash = ?`;
    closeParams.push(money(Number(closingCash)));
  }
  closeParams.push(shiftId);
  await query(closeSql + ` WHERE id = ?`, closeParams);

  const summaryData = await getShiftSummary(shiftId, closingCash);
  res.json({ shiftId, openedAt: openShift[0].opened_at, closedAt: nowSql(), summary: summaryData });
});

// List closed shifts for a center
app.get("/api/shifts/closed", requireAuth, async (req, res) => {
  try {
    const { centerId, limit = 20 } = req.query;
    if (!centerId) return res.status(400).json({ error: "centerId es requerido" });
    const [rows] = await query(
      `SELECT s.id, s.opened_at, s.closed_at, s.opening_cash, s.closing_cash,
              s.closing_note, u.full_name AS cashier_name
       FROM shifts s
       LEFT JOIN staff_users u ON u.id = s.cashier_id
       WHERE s.status = 'closed' AND s.operation_center_id = ?
       ORDER BY s.closed_at DESC
       LIMIT ?`,
      [Number(centerId), Number(limit)]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get shift report by ID (for reprint)
app.get("/api/shifts/:shiftId/report", requireAuth, async (req, res) => {
  try {
    const shiftId = Number(req.params.shiftId);
    const [shiftRows] = await query(
      `SELECT s.*, u.full_name AS cashier_name
       FROM shifts s
       LEFT JOIN staff_users u ON u.id = s.cashier_id
       WHERE s.id = ?`,
      [shiftId]
    );
    if (!shiftRows.length) return res.status(404).json({ error: "Turno no encontrado" });
    const summaryData = await getShiftSummary(shiftId, shiftRows[0].closing_cash);
    res.json({ shift: shiftRows[0], summary: summaryData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/reports/voided-items", async (_req, res) => {
  // Get voided items with authorization info
  const [voidedRows] = await query(
    `SELECT
       oi.id,
       a.id AS account_id,
       a.check_number,
       p.name AS product_name,
       oi.qty AS void_qty,
       oi.line_total AS void_total,
       oi.void_reason,
       oi.voided_at,
       oi.void_authorized_by,
       u.full_name AS authorized_by_name
     FROM order_items oi
     INNER JOIN accounts a ON a.id = oi.account_id
     INNER JOIN products p ON p.id = oi.product_id
     LEFT JOIN staff_users u ON u.id = oi.void_authorized_by
     WHERE oi.status = 'void'
     ORDER BY oi.voided_at DESC`
  );

  if (!voidedRows.length) {
    return res.json([]);
  }

  // Get all account IDs from voided items
  const accountIds = [...new Set(voidedRows.map(r => r.account_id))];

  // Get all products per account (including voided ones)
  const [allItems] = await query(
    `SELECT
       oi.account_id,
       p.name AS product_name,
       oi.qty,
       oi.line_total,
       oi.status
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.account_id IN (${accountIds.map(() => '?').join(',')})
     ORDER BY oi.id ASC`,
    accountIds
  );

  // Group products by account_id
  const itemsByAccount = {};
  allItems.forEach(item => {
    if (!itemsByAccount[item.account_id]) itemsByAccount[item.account_id] = [];
    itemsByAccount[item.account_id].push(item);
  });

  // Attach account products to each voided row
  const result = voidedRows.map(row => ({
    ...row,
    account_products: itemsByAccount[row.account_id] || [],
  }));

  res.json(result);
});

app.get("/api/reports/waiter-tips", async (req, res) => {
  try {
    const { startDate, endDate, waiterId, centerId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate y endDate son requeridos" });
    }

    const globalTipPercent = await getTipPercent();

    const [excludedRows] = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'tip_excluded_methods' LIMIT 1`
    );
    const excludedMethods = (excludedRows?.[0]?.setting_value || 'cxc')
      .split(',').map(s => s.trim()).filter(Boolean);

    const [accounts] = await query(
      `SELECT a.id, a.waiter_id, a.operation_center_id, a.check_number, a.closed_at, a.tip_percent_override,
              u.full_name AS waiter_name, oc.name AS center_name
       FROM accounts a
       JOIN staff_users u ON u.id = a.waiter_id
       JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE a.status = 'paid'
         AND a.closed_at >= ? AND a.closed_at < DATE_ADD(?, INTERVAL 1 DAY)
         AND (? IS NULL OR a.waiter_id = ?)
         AND (? IS NULL OR a.operation_center_id = ?)
       ORDER BY u.full_name, a.closed_at`,
      [startDate, endDate, waiterId || null, waiterId || null, centerId || null, centerId || null]
    );

    const details = [];
    const byWaiter = {};

    for (const acc of accounts) {
      const [paymentMethods] = await query(
        `SELECT DISTINCT method FROM account_payments WHERE account_id = ?`,
        [acc.id]
      );
      const methodsUsed = paymentMethods.map(r => String(r.method).trim());
      const hasEligiblePayment = methodsUsed.some(m => !excludedMethods.includes(m));
      const totals = await getAccountTotals(acc.id);
      const effectiveTip = hasEligiblePayment ? totals.tipAmount : 0;

      const row = {
        accountId: acc.id,
        checkNumber: acc.check_number,
        closedAt: acc.closed_at,
        waiterId: acc.waiter_id,
        waiterName: acc.waiter_name,
        centerId: acc.operation_center_id,
        centerName: acc.center_name,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        tipPercent: totals.tipPercent,
        tipAmount: effectiveTip,
        tipEligible: hasEligiblePayment,
        paymentMethods: methodsUsed,
        total: totals.total,
      };
      details.push(row);

      const key = `${acc.waiter_id}-${acc.operation_center_id}`;
      if (!byWaiter[key]) {
        byWaiter[key] = {
          waiterId: acc.waiter_id,
          waiterName: acc.waiter_name,
          centerId: acc.operation_center_id,
          centerName: acc.center_name,
          accountCount: 0,
          eligibleCount: 0,
          totalSubtotal: 0,
          totalDiscounts: 0,
          totalTips: 0,
          totalGeneral: 0,
        };
      }
      byWaiter[key].accountCount++;
      if (hasEligiblePayment) byWaiter[key].eligibleCount++;
      byWaiter[key].totalSubtotal += totals.subtotal;
      byWaiter[key].totalDiscounts += totals.discountTotal;
      byWaiter[key].totalTips += effectiveTip;
      byWaiter[key].totalGeneral += totals.total;
    }

    res.json({
      globalTipPercent,
      excludedMethods,
      details,
      summary: Object.values(byWaiter),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// Product sales by category report
app.get("/api/reports/product-sales", async (req, res) => {
  try {
    const { startDate, endDate, centerId, categoryId, productName } = req.query;
    const conditions = ["oi.status = 'active'", "a.status = 'paid'"];
    const params = [];
    if (startDate) {
      conditions.push('a.closed_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('a.closed_at <= ?');
      params.push(endDate + ' 23:59:59');
    }
    if (centerId) {
      conditions.push('a.operation_center_id = ?');
      params.push(Number(centerId));
    }
    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(Number(categoryId));
    }
    if (productName && productName.trim()) {
      conditions.push('p.name LIKE ?');
      params.push(`%${productName.trim()}%`);
    }

    const [rows] = await query(
      `SELECT pc.id AS category_id, pc.name AS category_name,
              p.id AS product_id, p.name AS product_name,
              SUM(oi.qty) AS total_qty,
              SUM(oi.line_total) AS total_sales,
              COUNT(DISTINCT a.id) AS account_count
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY pc.id, p.id
       ORDER BY pc.name, total_sales DESC`,
      params
    );

    const [totals] = await query(
      `SELECT COUNT(DISTINCT a.id) AS total_accounts,
              SUM(oi.qty) AS grand_qty,
              SUM(oi.line_total) AS grand_total
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    const [categories] = await query(
      `SELECT id, name FROM product_categories WHERE is_active = 1 ORDER BY sort_order, name`
    );

    res.json({ rows, totals: totals[0] || { total_accounts: 0, grand_qty: 0, grand_total: 0 }, categories });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SALES BY PAYMENT METHOD
// ============================================================
app.get("/api/reports/sales-by-payment-method", async (req, res) => {
  try {
    const { startDate, endDate, centerId, method } = req.query;
    const whereClauses = ["a.status = 'paid'"];
    const params = [];

    if (startDate) {
      whereClauses.push('a.closed_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('a.closed_at <= ?');
      params.push(endDate + ' 23:59:59');
    }
    if (centerId) {
      whereClauses.push('a.operation_center_id = ?');
      params.push(Number(centerId));
    }

    const where = whereClauses.join(' AND ');

    // Summary by payment method
    const [methodSummary] = await query(
      `SELECT
         ap.method,
         COUNT(*) AS transaction_count,
         SUM(ap.amount) AS total_amount
       FROM account_payments ap
       INNER JOIN accounts a ON ap.account_id = a.id
       WHERE ${where}
       GROUP BY ap.method
       ORDER BY total_amount DESC`,
      params
    );

    // Grand total
    const [grandTotal] = await query(
      `SELECT COALESCE(SUM(ap.amount), 0) AS grand_total
       FROM account_payments ap
       INNER JOIN accounts a ON ap.account_id = a.id
       WHERE ${where}`,
      params
    );

    // Detail query with optional method filter
    let detailWhere = where;
    let detailParams = [...params];
    if (method && method.trim()) {
      detailWhere += ` AND ap.method = ?`;
      detailParams.push(method.trim());
    }

    const [paymentDetails] = await query(
      `SELECT
         ap.method,
         ap.amount,
         ap.reference_no,
         ap.created_at,
         a.check_number,
         a.id AS account_id,
         a.closed_at,
         oc.name AS center_name,
         (SELECT SUM(oi.line_total) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS account_total
       FROM account_payments ap
       INNER JOIN accounts a ON ap.account_id = a.id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${detailWhere}
       ORDER BY ap.created_at DESC
       LIMIT 500`,
      detailParams
    );

    // Group by method for the filtered/all detail view
    const detailByMethod = {};
    for (const p of paymentDetails) {
      if (!detailByMethod[p.method]) detailByMethod[p.method] = [];
      detailByMethod[p.method].push(p);
    }

    res.json({
      methods: methodSummary || [],
      grand_total: grandTotal?.[0]?.grand_total || 0,
      payment_details: paymentDetails || [],
      detail_by_method: detailByMethod,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SALES BY CENTER COMPARISON
// ============================================================
app.get("/api/reports/sales-by-center", async (req, res) => {
  try {
    const { startDate, endDate, centerId, productName, productIds } = req.query;
    const conditions = ["oi.status = 'active'", "a.status = 'paid'"];
    const params = [];

    if (startDate) {
      conditions.push('a.closed_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('a.closed_at <= ?');
      params.push(endDate + ' 23:59:59');
    }
    if (centerId) {
      conditions.push('a.operation_center_id = ?');
      params.push(Number(centerId));
    }
    if (productName && productName.trim()) {
      conditions.push('p.name LIKE ?');
      params.push(`%${productName.trim()}%`);
    }
    if (productIds && productIds.trim()) {
      const ids = productIds.split(',').map(id => Number(id.trim())).filter(id => id > 0);
      if (ids.length > 0) {
        conditions.push(`p.id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }

    const where = conditions.join(' AND ');

    // Totals by center
    const [centerTotals] = await query(
      `SELECT
         oc.id AS center_id,
         oc.name AS center_name,
         COUNT(DISTINCT a.id) AS account_count,
         COALESCE(SUM(oi.qty), 0) AS total_qty,
         COALESCE(SUM(oi.line_total), 0) AS total_sales
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}
       GROUP BY oc.id
       ORDER BY total_sales DESC`,
      params
    );

    // Detailed rows — each individual product sale
    const [detailRows] = await query(
      `SELECT
         oc.id AS center_id,
         oc.name AS center_name,
         pc.id AS category_id,
         pc.name AS category_name,
         p.id AS product_id,
         p.name AS product_name,
         a.check_number,
         a.id AS account_id,
         a.closed_at,
         a.merged_into_account_id,
         u.full_name AS waiter_name,
         oi.qty,
         oi.line_total
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       LEFT JOIN staff_users u ON u.id = a.waiter_id
       WHERE ${where}
       ORDER BY oc.name, pc.name, p.name, a.closed_at DESC
       LIMIT 2000`,
      params
    );

    // Grouped summary: product x center
    const [groupedRows] = await query(
      `SELECT
         oc.id AS center_id,
         oc.name AS center_name,
         pc.id AS category_id,
         pc.name AS category_name,
         p.id AS product_id,
         p.name AS product_name,
         SUM(oi.qty) AS total_qty,
         SUM(oi.line_total) AS total_sales,
         COUNT(DISTINCT a.id) AS account_count
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}
       GROUP BY oc.id, pc.id, p.id
       ORDER BY oc.name, pc.name, total_sales DESC`,
      params
    );

    // Cuentas unidas (status=void con merged_into_account_id) — mostrarlas con Q0 para rastreo
    // Reconstruir condiciones y params sin las referencias a oi (order_items)
    const mergedConds = [];
    const mergedParams = [];
    if (startDate) {
      mergedConds.push('a.closed_at >= ?');
      mergedParams.push(startDate);
    }
    if (endDate) {
      mergedConds.push('a.closed_at <= ?');
      mergedParams.push(endDate + ' 23:59:59');
    }
    if (centerId) {
      mergedConds.push('a.operation_center_id = ?');
      mergedParams.push(Number(centerId));
    }
    mergedConds.push("a.status = 'void'", "a.merged_into_account_id IS NOT NULL");
    const mergedWhere = mergedConds.join(' AND ');
    const [mergedAccounts] = await query(
      `SELECT
         a.id AS account_id,
         a.check_number,
         a.closed_at,
         a.merged_into_account_id,
         oc.name AS center_name,
         oc.id AS center_id,
         u.full_name AS waiter_name
       FROM accounts a
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       LEFT JOIN staff_users u ON u.id = a.waiter_id
       WHERE ${mergedWhere}
       ORDER BY a.closed_at DESC
       LIMIT 500`,
      mergedParams
    );

    // Categorize grouped as shared / exclusive
    const productMap = {};
    groupedRows.forEach(r => {
      if (!productMap[r.product_id]) {
        productMap[r.product_id] = {
          product_id: r.product_id,
          product_name: r.product_name,
          category_name: r.category_name,
          centers: [],
          total_qty: 0,
          total_sales: 0,
        };
      }
      productMap[r.product_id].centers.push({
        center_id: r.center_id,
        center_name: r.center_name,
        qty: Number(r.total_qty),
        sales: Number(r.total_sales),
        account_count: Number(r.account_count),
      });
      productMap[r.product_id].total_qty += Number(r.total_qty);
      productMap[r.product_id].total_sales += Number(r.total_sales);
    });

    const products = Object.values(productMap);
    const sharedProducts = products.filter(p => p.centers.length > 1);
    const exclusiveProducts = products.filter(p => p.centers.length === 1);

    const [grandTotal] = await query(
      `SELECT COALESCE(SUM(oi.line_total), 0) AS grand_total,
              COALESCE(SUM(oi.qty), 0) AS grand_qty
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       WHERE ${where}`,
      params
    );

    res.json({
      center_totals: centerTotals || [],
      products: products,
      shared_products: sharedProducts,
      exclusive_products: exclusiveProducts,
      detail_rows: detailRows || [],
      merged_accounts: mergedAccounts || [],
      grand_total: grandTotal?.[0]?.grand_total || 0,
      grand_qty: grandTotal?.[0]?.grand_qty || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SALES BY USER / EMPLOYEE
// ============================================================
app.get("/api/reports/sales-by-user", async (req, res) => {
  try {
    const {
      startDate, endDate,
      centerId,
      productIds,   // comma-separated product IDs
      productName,  // text search
      categoryId,
      userIds,      // comma-separated user IDs
    } = req.query;

    const conditions = ["oi.status = 'active'", "a.status = 'paid'", "u.id IS NOT NULL"];
    const params = [];

    if (startDate) {
      conditions.push('a.closed_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('a.closed_at <= ?');
      params.push(endDate + ' 23:59:59');
    }
    if (centerId) {
      conditions.push('a.operation_center_id = ?');
      params.push(Number(centerId));
    }
    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(Number(categoryId));
    }
    if (productIds && productIds.trim()) {
      const ids = productIds.split(',').map(id => Number(id.trim())).filter(id => id > 0);
      if (ids.length > 0) {
        conditions.push(`p.id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }
    if (productName && productName.trim()) {
      conditions.push('p.name LIKE ?');
      params.push(`%${productName.trim()}%`);
    }
    if (userIds && userIds.trim()) {
      const ids = userIds.split(',').map(id => Number(id.trim())).filter(id => id > 0);
      if (ids.length > 0) {
        conditions.push(`a.waiter_id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }

    const where = conditions.join(' AND ');

    // Detail: each individual product sale with user info
    const [detailRows] = await query(
      `SELECT
         u.id AS user_id,
         u.full_name AS user_name,
         u.role AS user_role,
         oc.id AS center_id,
         oc.name AS center_name,
         pc.id AS category_id,
         pc.name AS category_name,
         p.id AS product_id,
         p.name AS product_name,
         a.check_number,
         a.id AS account_id,
         a.closed_at,
         a.merged_into_account_id,
         oi.qty,
         oi.line_total
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN product_categories pc ON pc.id = p.category_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}
       ORDER BY u.full_name, pc.name, p.name, a.closed_at DESC
       LIMIT 3000`,
      params
    );

    // Cuentas unidas (status=void con merged_into_account_id)
    const mergedConds2 = [];
    const mergedParams2 = [];
    if (startDate) {
      mergedConds2.push('a.closed_at >= ?');
      mergedParams2.push(startDate);
    }
    if (endDate) {
      mergedConds2.push('a.closed_at <= ?');
      mergedParams2.push(endDate + ' 23:59:59');
    }
    if (centerId) {
      mergedConds2.push('a.operation_center_id = ?');
      mergedParams2.push(Number(centerId));
    }
    if (userIds && userIds.trim()) {
      const ids = userIds.split(',').map(id => Number(id.trim())).filter(id => id > 0);
      if (ids.length > 0) {
        mergedConds2.push(`a.waiter_id IN (${ids.map(() => '?').join(',')})`);
        mergedParams2.push(...ids);
      }
    }
    mergedConds2.push("a.status = 'void'", "a.merged_into_account_id IS NOT NULL");
    const mergedWhere = mergedConds2.join(' AND ');
    const [mergedAccounts] = await query(
      `SELECT
         a.id AS account_id,
         a.check_number,
         a.closed_at,
         a.merged_into_account_id,
         u.id AS user_id,
         u.full_name AS user_name,
         u.role AS user_role,
         oc.id AS center_id,
         oc.name AS center_name
       FROM accounts a
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${mergedWhere}
       ORDER BY a.closed_at DESC
       LIMIT 500`,
      mergedParams2
    );

    // Grouped by user
    const userMap = {};
    detailRows.forEach(r => {
      if (!userMap[r.user_id]) {
        userMap[r.user_id] = {
          user_id: r.user_id,
          user_name: r.user_name,
          user_role: r.user_role,
          center_name: r.center_name,
          total_qty: 0,
          total_sales: 0,
          product_count: 0,
          products: {},
        };
      }
      if (!userMap[r.user_id].products[r.product_id]) {
        userMap[r.user_id].products[r.product_id] = {
          product_id: r.product_id,
          product_name: r.product_name,
          category_name: r.category_name,
          qty: 0,
          sales: 0,
        };
        userMap[r.user_id].product_count++;
      }
      userMap[r.user_id].products[r.product_id].qty += Number(r.qty);
      userMap[r.user_id].products[r.product_id].sales += Number(r.line_total);
      userMap[r.user_id].total_qty += Number(r.qty);
      userMap[r.user_id].total_sales += Number(r.line_total);
    });

    const users = Object.values(userMap)
      .map(u => ({
        ...u,
        products: Object.values(u.products),
      }))
      .sort((a, b) => b.total_sales - a.total_sales);

    // Grouped by product for comparison
    const productMap = {};
    detailRows.forEach(r => {
      if (!productMap[r.product_id]) {
        productMap[r.product_id] = {
          product_id: r.product_id,
          product_name: r.product_name,
          category_name: r.category_name,
          center_name: r.center_name,
          total_qty: 0,
          total_sales: 0,
          sellers: [],
        };
      }
      if (!productMap[r.product_id].sellers.find(s => s.user_id === r.user_id)) {
        productMap[r.product_id].sellers.push({
          user_id: r.user_id,
          user_name: r.user_name,
          qty: 0,
          sales: 0,
        });
      }
      const seller = productMap[r.product_id].sellers.find(s => s.user_id === r.user_id);
      seller.qty += Number(r.qty);
      seller.sales += Number(r.line_total);
      productMap[r.product_id].total_qty += Number(r.qty);
      productMap[r.product_id].total_sales += Number(r.line_total);
    });

    const productComparison = Object.values(productMap)
      .sort((a, b) => b.total_sales - a.total_sales);

    // Grand totals
    const [grandTotal] = await query(
      `SELECT COALESCE(SUM(oi.line_total), 0) AS grand_total,
              COALESCE(SUM(oi.qty), 0) AS grand_qty
       FROM order_items oi
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       INNER JOIN products p ON p.id = oi.product_id
       LEFT JOIN operation_centers oc ON oc.id = a.operation_center_id
       WHERE ${where}`,
      params
    );

    res.json({
      users,
      product_comparison: productComparison,
      detail_rows: detailRows || [],
      merged_accounts: mergedAccounts || [],
      grand_total: grandTotal?.[0]?.grand_total || 0,
      grand_qty: grandTotal?.[0]?.grand_qty || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
    console.error('Error al inicializar la base de datos en el arranque:', e.message);
  }
});
