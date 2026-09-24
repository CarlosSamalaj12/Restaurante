// server.js
// Punto de entrada principal y bootstrap del servidor POS

require("dotenv").config();
const express = require("express");
const path = require("path");
const { pool, query } = require("./src/db");
const license = require("./src/license");
const apiRoutes = require("./src/routes");
const { traceMiddleware, errorHandler } = require("./src/common/middlewares");
const { ensureConfigTables } = require("./src/modules/settings/settings.migration");

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

  // Tablas del sistema de licencias
  try {
    await license.ensureLicenseTables();
    console.log("[MIGRATION] Tablas de licencias OK");
    await license.expireOverdueLicenses();
  } catch (e) {
    console.error("[MIGRATION] Error en tablas de licencias:", e.message);
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
})();

const app = express();

app.use(traceMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Middleware global de licenciamiento
const LICENSE_EXEMPT_PATHS = [
  "/api/license",
  "/api/bootstrap",
];
app.use("/api", (req, res, next) => {
  const fullPath = req.originalUrl.split("?")[0];
  if (fullPath.startsWith("/api/settings") || fullPath.startsWith("/api/admin")) {
    return next();
  }
  if (LICENSE_EXEMPT_PATHS.some((p) => fullPath.startsWith(p))) {
    return next();
  }
  return license.requireLicensedTerminal(req, res, next);
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

const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
  try {
    await ensureConfigTables();
    await pool.query("SELECT 1");
    console.log(`POS activo en http://localhost:${port}`);
  } catch (e) {
    console.error("[SERVER] Error al iniciar o ejecutar migraciones:", e);
  }
});

module.exports = app;
