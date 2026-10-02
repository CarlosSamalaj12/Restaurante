// src/modules/fel/fel.migration.js
// Migración y aseguramiento de tablas para el módulo FEL (Facturación Electrónica Guatemala)

const { query, safeExec } = require("../../common/db");

async function ensureFelTables() {
  // 1. Tabla de configuración del certificador y reglas de facturación
  await query(`
    CREATE TABLE IF NOT EXISTS fel_config (
      id INT PRIMARY KEY DEFAULT 1,
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,
      provider VARCHAR(30) NOT NULL DEFAULT 'demo',
      environment VARCHAR(20) NOT NULL DEFAULT 'sandbox',
      issuer_nit VARCHAR(30) NOT NULL DEFAULT 'CF',
      issuer_name VARCHAR(150) NOT NULL DEFAULT 'Mi Restaurante',
      commercial_name VARCHAR(150) NOT NULL DEFAULT 'Mi Restaurante',
      establishment_code INT NOT NULL DEFAULT 1,
      affiliation VARCHAR(30) NOT NULL DEFAULT 'GEN',
      sat_phrase_type VARCHAR(50) NOT NULL DEFAULT '1',
      sat_phrase_code VARCHAR(50) NOT NULL DEFAULT '1',
      api_username VARCHAR(100) NULL,
      api_key TEXT NULL,
      api_token TEXT NULL,
      api_alias VARCHAR(100) NULL,
      receipt_copies INT NOT NULL DEFAULT 1,
      kitchen_copies INT NOT NULL DEFAULT 1,
      ticket_width VARCHAR(10) NOT NULL DEFAULT '80mm',
      print_qr TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Asegurar fila inicial
  await query(`
    INSERT INTO fel_config (id, is_enabled, provider, environment, issuer_nit, issuer_name, commercial_name, establishment_code)
    VALUES (1, 0, 'demo', 'sandbox', 'CF', 'Mi Restaurante', 'Mi Restaurante', 1)
    ON DUPLICATE KEY UPDATE id = id;
  `);

  // 2. Tabla de facturas electrónicas emitidas (DTEs)
  await query(`
    CREATE TABLE IF NOT EXISTS fel_invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_id INT NOT NULL,
      uuid VARCHAR(100) NOT NULL,
      serie VARCHAR(30) NOT NULL,
      dte_number VARCHAR(50) NOT NULL,
      certified_at DATETIME NOT NULL,
      recipient_nit VARCHAR(30) NOT NULL DEFAULT 'CF',
      recipient_name VARCHAR(200) NOT NULL DEFAULT 'Consumidor Final',
      recipient_address VARCHAR(255) NOT NULL DEFAULT 'Ciudad',
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      certifier VARCHAR(30) NOT NULL DEFAULT 'demo',
      status ENUM('certified', 'voided', 'failed') NOT NULL DEFAULT 'certified',
      xml_url TEXT NULL,
      pdf_url TEXT NULL,
      qr_data TEXT NULL,
      void_reason TEXT NULL,
      voided_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_account (account_id),
      INDEX idx_uuid (uuid),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. Extender tabla de formas de pago con configuración de facturación automática
  await safeExec(`
    ALTER TABLE payment_methods
    ADD COLUMN auto_invoice TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN default_recipient VARCHAR(20) NOT NULL DEFAULT 'CF'
  `);
}

module.exports = {
  ensureFelTables,
};
