require("dotenv").config();
const { pool, query } = require("../src/db");

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

async function run() {
  console.log("Iniciando migración segura...");

  // 1. business_profile
  await query(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id INT AUTO_INCREMENT PRIMARY KEY,
      restaurant_name VARCHAR(150) NOT NULL DEFAULT 'Mi Restaurante',
      logo_url TEXT NULL,
      login_bg_url TEXT NULL,
      phone VARCHAR(40) NULL,
      address VARCHAR(255) NULL,
      tax_id VARCHAR(50) NULL,
      currency_symbol VARCHAR(10) NOT NULL DEFAULT 'Q',
      tip_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      receipt_footer TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log("✓ Tabla business_profile OK");

  // Sembrar datos iniciales en business_profile desde app_settings si está vacía
  const [profiles] = await query("SELECT id FROM business_profile LIMIT 1");
  if (!profiles.length) {
    const [settings] = await query("SELECT setting_key, setting_value FROM app_settings");
    const sMap = {};
    for (const s of settings) sMap[s.setting_key] = s.setting_value;

    await query(
      `INSERT INTO business_profile (restaurant_name, logo_url, login_bg_url, tip_percent, currency_symbol, receipt_footer)
       VALUES (?, ?, ?, ?, 'Q', '¡Gracias por su preferencia!')`,
      [
        sMap["restaurant_name"] || "Mi Restaurante",
        sMap["logo_url"] || null,
        sMap["login_bg_url"] || null,
        Number(sMap["tip_percent"] || 10)
      ]
    );
    console.log("✓ business_profile sembrado desde app_settings");
  }

  // 2. Columna applies_tip en payment_methods
  await safeExec("ALTER TABLE payment_methods ADD COLUMN applies_tip TINYINT(1) NOT NULL DEFAULT 1");
  console.log("✓ Columna applies_tip en payment_methods OK");

  // Excluir 'cxc' por defecto de propina
  await query("UPDATE payment_methods SET applies_tip = 0 WHERE code = 'cxc'");
  console.log("✓ Método 'cxc' configurado con applies_tip = 0");

  // 3. Modificar group_type en modifier_groups
  await query("ALTER TABLE modifier_groups MODIFY COLUMN group_type VARCHAR(50) NOT NULL DEFAULT 'multiple'");
  console.log("✓ modifier_groups.group_type convertido a VARCHAR(50)");

  // Actualizar 'other' a 'single' o 'multiple' según min/max
  const [updateMods] = await query(
    "UPDATE modifier_groups SET group_type = IF(min_select = 1 AND max_select = 1, 'single', 'multiple') WHERE group_type = 'other'"
  );
  console.log(`✓ ${updateMods.affectedRows} modificadores actualizados a single/multiple`);

  console.log("¡Migración completada con éxito!");
  process.exit(0);
}

run().catch((e) => {
  console.error("Error en migración:", e);
  process.exit(1);
});
