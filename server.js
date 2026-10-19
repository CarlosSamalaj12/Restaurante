// server.js
// Punto de entrada principal y bootstrap del servidor POS

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { pool, query } = require("./src/db");
const license = require("./src/license");
const apiRoutes = require("./src/routes");
const { traceMiddleware, errorHandler } = require("./src/common/middlewares");
const { ensureConfigTables } = require("./src/modules/settings/settings.migration");
const { ensureExpensesTables } = require("./src/modules/expenses/expenses.migration");
const { ensureDigitalMenuTables } = require("./src/modules/digital_menu/digital_menu.migration");
const { initSocket } = require("./src/common/sockets");
const maintenanceService = require("./src/modules/maintenance/maintenance.service");

// Migraciones de esquema — se ejecutan una vez al iniciar
(async () => {
  try {
    await query(
      `ALTER TABLE accounts ADD COLUMN merged_into_account_id INT NULL AFTER status`
    );
    console.log("[MIGRATION] Columna merged_into_account_id agregada a accounts");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("[MIGRATION] Columna merged_into_account_id ya existe — OK");
    } else {
      console.warn("[MIGRATION] Error al agregar columna:", e.message);
    }
  }

  // Superadmin: soporte de rol superadmin en staff_users y asignación
  try {
    await query(`ALTER TABLE staff_users MODIFY COLUMN role VARCHAR(40) NOT NULL DEFAULT 'waiter'`);
    await query(`
      INSERT INTO roles (name, slug, description, is_system)
      VALUES ('Super Administrador', 'superadmin', 'Acceso total y configuración técnica sensible', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name), is_system = 1
    `);
    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p WHERE r.slug = 'superadmin'
    `);
    // Promover usuario principal (Carlos Samalaj) a superadmin
    await query(`UPDATE staff_users SET role = 'superadmin' WHERE id = 3 OR full_name LIKE '%Carlos Samalaj%' OR pin_code = '1203'`);
    await query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT u.id, r.id FROM staff_users u, roles r WHERE (u.id = 3 OR u.full_name LIKE '%Carlos Samalaj%' OR u.pin_code = '1203') AND r.slug = 'superadmin'
    `);
    console.log("[MIGRATION] Rol superadmin configurado y asignado a Carlos Samalaj");
  } catch (e) {
    console.warn("[MIGRATION] Error al configurar rol superadmin:", e.message);
  }

  // Tablas del sistema de licencias
  try {
    await license.ensureLicenseTables();
    console.log("[MIGRATION] Tablas de licencias OK");
    await license.expireOverdueLicenses();
  } catch (e) {
    console.error("[MIGRATION] Error en tablas de licencias:", e.message);
  }

  // Tablas de modo mantenimiento y control de versiones
  try {
    await maintenanceService.ensureTables();
    console.log("[MIGRATION] Tablas de mantenimiento y versiones OK");
  } catch (e) {
    console.warn("[MIGRATION] Error en tablas de mantenimiento:", e.message);
  }

  // Printers: columnas en production_centers
  try {
    await query(
      `ALTER TABLE production_centers
       ADD COLUMN printer_ip VARCHAR(45) NULL AFTER printer_name,
       ADD COLUMN printer_port INT NOT NULL DEFAULT 9100 AFTER printer_ip`
    );
    console.log("[MIGRATION] printer_ip/printer_port agregados a production_centers");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("[MIGRATION] printer_ip/printer_port ya existen en production_centers — OK");
    } else {
      console.warn("[MIGRATION] Error al agregar columnas de printer a production_centers:", e.message);
    }
  }

  // Printers: tabla print_jobs
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
    console.log("[MIGRATION] Tabla print_jobs OK");
  } catch (e) {
    console.warn("[MIGRATION] Error al crear tabla print_jobs:", e.message);
  }

  // Shifts: tabla shift_expenses (retiros y gastos de caja chica)
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS shift_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shift_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        authorized_by INT NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_shift_expense (shift_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("[MIGRATION] Tabla shift_expenses OK");
  } catch (e) {
    console.warn("[MIGRATION] Error al crear tabla shift_expenses:", e.message);
  }

  // auth_sessions
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
    console.log("[MIGRATION] Tabla auth_sessions OK");

    const [delResult] = await query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
    if (delResult.affectedRows > 0) {
      console.log(`[MIGRATION] auth_sessions: ${delResult.affectedRows} sesiones expiradas purgadas`);
    }

    setInterval(async () => {
      try {
        const [r] = await query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
        if (r.affectedRows > 0) {
          console.log(`[auth.session.cleanup] ${r.affectedRows} sesiones expiradas purgadas`);
        }
      } catch (e) {}
    }, 60 * 60 * 1000);
  } catch (e) {
    console.warn("[MIGRATION] Error al crear tabla auth_sessions:", e.message);
  }

  // Expenses & CXP: tablas de gastos, proveedores y pagos
  try {
    await ensureExpensesTables();
  } catch (e) {
    console.warn("[MIGRATION] Error al asegurar tablas de gastos:", e.message);
  }

  // Digital Menu & Auto-Comanda (QR / NFC / Kiosco)
  try {
    await ensureDigitalMenuTables();
  } catch (e) {
    console.warn("[MIGRATION] Error al asegurar tablas de Menú Digital:", e.message);
  }
})();

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : null;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Permitir clientes sin cabecera origin (móviles, apps locales o same-origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins) {
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      }
      // Permitir localhost, loopback y terminales POS en subredes locales (LAN)
      const isLocalOrLan =
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          origin
        );
      if (isLocalOrLan) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST"],
  },
});
initSocket(io);

// Cabeceras de seguridad HTTP (defensa contra MIME-sniffing, clickjacking y XSS)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(traceMiddleware);
app.use(express.json({ limit: "10mb" }));

const reactDistPath = path.join(__dirname, "react-app", "dist");
if (require("fs").existsSync(reactDistPath)) {
  app.use(express.static(reactDistPath));
}

// Servir uploads de imágenes con caché optimizado HTTP (30 días para carga inmediata 0ms en re-visitas)
const uploadsPath = path.join(__dirname, "public", "uploads");
if (require("fs").existsSync(uploadsPath)) {
  app.use(
    "/uploads",
    express.static(uploadsPath, {
      maxAge: "30d",
      immutable: true,
      etag: true,
      lastModified: true,
    })
  );
}

app.use(express.static(path.join(__dirname, "public"), { maxAge: "1d" }));

// Middleware global de licenciamiento
// /api/license/* y /api/public/* están exentos para comensales y enrollment
const LICENSE_EXEMPT_PATHS = [
  "/api/license",
  "/api/public",
];
app.use("/api", (req, res, next) => {
  const fullPath = req.originalUrl.split("?")[0];
  if (LICENSE_EXEMPT_PATHS.some((p) => fullPath.startsWith(p))) {
    return next();
  }
  return license.requireLicensedTerminal(req, res, next);
});

// Middleware de Modo Mantenimiento (Exclusivo Superadmin durante mantenimiento)
const MAINTENANCE_EXEMPT_PATHS = [
  "/api/maintenance",
  "/api/auth/login",
  "/api/bootstrap",
  "/api/license",
  "/api/public",
];
app.use("/api", async (req, res, next) => {
  try {
    const fullPath = req.originalUrl.split("?")[0];
    if (MAINTENANCE_EXEMPT_PATHS.some((p) => fullPath.startsWith(p))) {
      return next();
    }

    const isInMaintenance = await maintenanceService.isSystemInMaintenance();
    if (!isInMaintenance) {
      return next();
    }

    // Si el sistema está en mantenimiento, permitir exclusivamente a Superadmin
    const token = String(req.headers["x-auth-token"] || "").trim();
    if (token) {
      const authService = require("./src/modules/auth/auth.service");
      const session = await authService.getAuthSession(token);
      if (session && String(session.role || "").toLowerCase() === "superadmin") {
        return next();
      }
    }

    const status = await maintenanceService.getStatus();
    return res.status(503).json({
      ok: false,
      code: "MAINTENANCE_MODE",
      message: "El sistema se encuentra en modo mantenimiento. Acceso temporalmente restringido para usuarios regulares.",
      maintenance: true,
      reason: status.reason || "Mantenimiento y actualización en curso",
      targetVersion: status.targetVersion || "v1.0.0",
    });
  } catch (err) {
    next(err);
  }
});

// Rutas desacopladas de la API
app.use("/api", apiRoutes);

// Job periódico de licencias
setInterval(() => {
  license.expireOverdueLicenses().catch((e) =>
    console.error("[license] expirer error:", e.message),
  );
}, 6 * 60 * 60 * 1000);

// Manejador centralizado de errores
app.use(errorHandler);

// Fallback SPA para rutas cliente (sirve index.html de React)
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
    return next();
  }
  const indexPath = path.join(reactDistPath, "index.html");
  if (require("fs").existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

const port = Number(process.env.PORT || 3000);
server.listen(port, async () => {
  try {
    await ensureConfigTables();
    await pool.query("SELECT 1");
    console.log(`POS activo en http://localhost:${port}`);
  } catch (e) {
    console.error("[SERVER] Error al iniciar o ejecutar migraciones:", e);
  }
});

module.exports = server;
module.exports.app = app;
