require('dotenv').config();
const { query } = require('../src/common/db');

async function main() {
  await query(`
    INSERT INTO permissions (name, slug, module_code, description)
    VALUES ('Ver Cuentas y Pagos (Cuentas Abiertas)', 'views.accounts', 'views', 'Acceso al módulo de cuentas abiertas, cobros y pre-cuentas')
    ON DUPLICATE KEY UPDATE name = VALUES(name), module_code = VALUES(module_code), description = VALUES(description)
  `);

  await query(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.slug IN ('admin', 'superadmin', 'manager', 'cashier') AND p.slug = 'views.accounts'
  `);

  const [rows] = await query("SELECT id, name, slug, module_code, description FROM permissions WHERE slug = 'views.accounts'");
  console.log('SUCCESS:', rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
