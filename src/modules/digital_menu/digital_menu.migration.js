// src/modules/digital_menu/digital_menu.migration.js
// Migración y aseguramiento de tablas para Menú Digital, Auto-Comanda (QR/NFC) y Kioscos

const fs = require("fs");
const path = require("path");
const { query, safeExec } = require("../../common/db");

async function ensureDigitalMenuTables() {
  // 1. Directorios para subida de imágenes (.webp) de productos, logos y banners
  const baseUploadsDir = path.join(process.cwd(), "public", "uploads", "menu");
  const subDirs = ["products", "logos", "banners"];
  for (const sub of subDirs) {
    const dir = path.join(baseUploadsDir, sub);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 2. Extensión de columnas en 'products' para catálogo digital
  await safeExec(`ALTER TABLE products ADD COLUMN image_url TEXT NULL`);
  await safeExec(`ALTER TABLE products ADD COLUMN description TEXT NULL`);
  await safeExec(`ALTER TABLE products ADD COLUMN dietary_tags JSON NULL`);
  await safeExec(`ALTER TABLE products ADD COLUMN estimated_prep_min INT NOT NULL DEFAULT 15`);
  await safeExec(`ALTER TABLE products ADD COLUMN rating_avg DECIMAL(3,2) NOT NULL DEFAULT 5.00`);
  await safeExec(`ALTER TABLE products ADD COLUMN rating_count INT NOT NULL DEFAULT 0`);

  // 3. Extensión de columnas en 'accounts' para trazabilidad de auto-comanda sin mesero
  await safeExec(
    `ALTER TABLE accounts ADD COLUMN order_source ENUM('pos_waiter', 'qr_guest', 'kiosk') NOT NULL DEFAULT 'pos_waiter'`
  );
  await safeExec(`ALTER TABLE accounts ADD COLUMN diner_device_token VARCHAR(64) NULL`);
  await safeExec(
    `ALTER TABLE accounts ADD COLUMN call_waiter_status ENUM('none', 'requested', 'attended') NOT NULL DEFAULT 'none'`
  );
  await safeExec(`ALTER TABLE accounts ADD COLUMN requested_payment_method VARCHAR(50) NULL`);

  // 4. Tabla de Menús Digitales (Theming dinámico, colores, logo y redes sociales)
  await query(
    `CREATE TABLE IF NOT EXISTS digital_menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE,
      description TEXT NULL,
      mode ENUM('catalog', 'interactive') NOT NULL DEFAULT 'interactive',
      primary_color VARCHAR(20) NOT NULL DEFAULT '#E63946',
      secondary_color VARCHAR(20) NOT NULL DEFAULT '#1D3557',
      bg_color VARCHAR(20) NOT NULL DEFAULT '#0F172A',
      text_color VARCHAR(20) NOT NULL DEFAULT '#F8FAFC',
      font_family VARCHAR(50) NOT NULL DEFAULT 'Inter, sans-serif',
      logo_url TEXT NULL,
      banner_url TEXT NULL,
      social_links JSON NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_menu_slug (slug),
      INDEX idx_menu_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 5. Tabla de Categorías asignadas por Menú
  await query(
    `CREATE TABLE IF NOT EXISTS digital_menu_categories (
      menu_id INT NOT NULL,
      category_id INT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (menu_id, category_id),
      CONSTRAINT fk_dmc_menu FOREIGN KEY (menu_id) REFERENCES digital_menus(id) ON DELETE CASCADE,
      CONSTRAINT fk_dmc_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 6. Tabla de Platillos asignados por Menú
  await query(
    `CREATE TABLE IF NOT EXISTS digital_menu_products (
      menu_id INT NOT NULL,
      product_id INT NOT NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      PRIMARY KEY (menu_id, product_id),
      CONSTRAINT fk_dmp_menu FOREIGN KEY (menu_id) REFERENCES digital_menus(id) ON DELETE CASCADE,
      CONSTRAINT fk_dmp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 7. Banners Promocionales (Hero Carousel)
  await query(
    `CREATE TABLE IF NOT EXISTS digital_promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      menu_id INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      subtitle VARCHAR(255) NULL,
      badge_text VARCHAR(50) NULL,
      image_url TEXT NOT NULL,
      target_type ENUM('product', 'category', 'url') NOT NULL DEFAULT 'product',
      target_id INT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_promo_menu FOREIGN KEY (menu_id) REFERENCES digital_menus(id) ON DELETE CASCADE,
      INDEX idx_promo_menu_active (menu_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 8. Tokens Criptográficos de Mesa (QR / Tags NFC con opción de Regenerar)
  await query(
    `CREATE TABLE IF NOT EXISTS table_qr_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_id INT NOT NULL,
      menu_id INT NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      salt VARCHAR(64) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      regenerated_at TIMESTAMP NULL,
      CONSTRAINT fk_tqt_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE,
      CONSTRAINT fk_tqt_menu FOREIGN KEY (menu_id) REFERENCES digital_menus(id) ON DELETE CASCADE,
      INDEX idx_tqt_hash (token_hash),
      INDEX idx_tqt_table (table_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 9. Sesiones Activas de Dispositivos de Comensales
  await query(
    `CREATE TABLE IF NOT EXISTS diner_device_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_token VARCHAR(64) NOT NULL UNIQUE,
      device_fingerprint VARCHAR(128) NOT NULL,
      table_id INT NOT NULL,
      account_id INT NOT NULL,
      menu_id INT NOT NULL,
      guest_alias VARCHAR(60) NOT NULL DEFAULT 'Comensal',
      status ENUM('active', 'closed') NOT NULL DEFAULT 'active',
      last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_dds_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
      CONSTRAINT fk_dds_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      INDEX idx_dds_token (session_token),
      INDEX idx_dds_table_account (table_id, account_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 10. Reseñas y Calificaciones de Platillos
  await query(
    `CREATE TABLE IF NOT EXISTS product_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      account_id INT NOT NULL,
      rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NULL,
      diner_name VARCHAR(80) NOT NULL DEFAULT 'Comensal',
      is_approved TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_review_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      INDEX idx_review_product (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 11. Usuario del Sistema para Auto-Comanda (Sin Mesero)
  // Se inserta de forma segura evitando duplicados
  const [existingUser] = await query(`SELECT id FROM staff_users WHERE id = 9999 LIMIT 1`);
  if (!existingUser.length) {
    const [centers] = await query(`SELECT id FROM operation_centers LIMIT 1`);
    const centerId = centers.length ? centers[0].id : null;
    await query(
      `INSERT INTO staff_users (id, full_name, role, pin_code, operation_center_id)
       VALUES (9999, 'Auto-Comanda (Cliente QR / Kiosco)', 'waiter', NULL, ?)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
      [centerId]
    );
  }

  // 12. Permiso 'digital_menu.manage' y asignación a roles administrativos
  await query(
    `INSERT INTO permissions (name, slug, module_code, description)
     VALUES ('Administrar Menús Digitales y QR', 'digital_menu.manage', 'settings', 'Creación de menús, theming, promociones y códigos QR')
     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`
  );

  await query(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p 
    WHERE r.slug IN ('superadmin', 'admin', 'manager') AND p.slug = 'digital_menu.manage'
  `);

  // 13. Módulo Premium en app_settings
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('module_digital_menu_enabled', '1')
     ON DUPLICATE KEY UPDATE setting_key = setting_key`
  );

  // 14. Menú inicial predeterminado si la tabla está vacía
  const [menus] = await query(`SELECT id FROM digital_menus LIMIT 1`);
  if (!menus.length) {
    const socialLinks = JSON.stringify({
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      whatsapp: "https://wa.me/",
    });
    const [res] = await query(
      `INSERT INTO digital_menus 
        (name, slug, description, mode, primary_color, secondary_color, bg_color, text_color, font_family, social_links, is_active)
       VALUES 
        ('Menú Principal', 'menu-principal', 'Menú digital interactivo y auto-comanda en mesa', 'interactive', '#E63946', '#1D3557', '#0F172A', '#F8FAFC', 'Inter, sans-serif', ?, 1)`,
      [socialLinks]
    );
    const newMenuId = res.insertId;

    // Asociar todas las categorías activas existentes al menú predeterminado
    await query(
      `INSERT IGNORE INTO digital_menu_categories (menu_id, category_id, sort_order)
       SELECT ?, id, sort_order FROM product_categories WHERE is_active = 1`,
      [newMenuId]
    );

    // Asociar todos los productos activos existentes al menú predeterminado
    await query(
      `INSERT IGNORE INTO digital_menu_products (menu_id, product_id, is_featured, sort_order)
       SELECT ?, id, 0, 0 FROM products WHERE is_active = 1`,
      [newMenuId]
    );

    console.log(`[MIGRATION] Menú Digital inicial creado con ID: ${newMenuId}`);
  }

  console.log("[MIGRATION] Tablas y permisos de Menú Digital y Auto-Comanda OK");
}

module.exports = { ensureDigitalMenuTables };
