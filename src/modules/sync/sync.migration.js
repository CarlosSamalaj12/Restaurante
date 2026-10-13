// src/modules/sync/sync.migration.js
// Migración para soporte de sincronización de ventas y comandas offline

const { query } = require("../../common/db");

async function safeExec(sql, params = []) {
  try {
    return await query(sql, params);
  } catch (err) {
    if (
      err.code === "ER_DUP_FIELDNAME" ||
      err.code === "ER_DUP_KEYNAME" ||
      err.message?.includes("Duplicate column") ||
      err.message?.includes("Duplicate key name")
    ) {
      return null;
    }
    console.warn(`[SYNC MIGRATION] Aviso en safeExec: ${err.message}`);
    return null;
  }
}

async function ensureSyncTables() {
  // Columnas en accounts
  await safeExec(`ALTER TABLE accounts ADD COLUMN offline_id VARCHAR(64) NULL`);
  await safeExec(`ALTER TABLE accounts ADD COLUMN terminal_code VARCHAR(32) NULL`);
  await safeExec(`ALTER TABLE accounts ADD COLUMN is_offline TINYINT(1) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE accounts ADD INDEX idx_accounts_offline_id (offline_id)`);

  // Columnas en order_items
  await safeExec(`ALTER TABLE order_items ADD COLUMN offline_id VARCHAR(64) NULL`);
  await safeExec(`ALTER TABLE order_items ADD INDEX idx_order_items_offline_id (offline_id)`);

  // Columnas en account_payments
  await safeExec(`ALTER TABLE account_payments ADD COLUMN offline_id VARCHAR(64) NULL`);
  await safeExec(`ALTER TABLE account_payments ADD COLUMN fel_pending_nit VARCHAR(32) NULL`);
  await safeExec(`ALTER TABLE account_payments ADD COLUMN fel_pending_name VARCHAR(128) NULL`);
  await safeExec(`ALTER TABLE account_payments ADD INDEX idx_payments_offline_id (offline_id)`);

  // Tabla para auditoría de sincronizaciones
  await query(`
    CREATE TABLE IF NOT EXISTS sync_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      terminal_code VARCHAR(32) NOT NULL,
      terminal_serial VARCHAR(128) NULL,
      accounts_count INT NOT NULL DEFAULT 0,
      items_count INT NOT NULL DEFAULT 0,
      payments_count INT NOT NULL DEFAULT 0,
      ip_address VARCHAR(45) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'completed',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = {
  ensureSyncTables,
};
