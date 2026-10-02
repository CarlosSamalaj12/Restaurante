require('dotenv').config();
const { query } = require('../src/common/db');

async function main() {
  const [rows] = await query(`
    SELECT r.slug AS role_slug, p.slug AS perm_slug, p.name AS perm_name
    FROM roles r
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE r.slug = 'waiter'
    ORDER BY p.slug
  `);
  console.log('WAITER PERMISSIONS IN DB:');
  console.log(rows.map(r => `${r.perm_slug} (${r.perm_name})`));

  const [staff] = await query(`
    SELECT id, full_name, role, pin_code FROM staff_users WHERE role = 'waiter'
  `);
  console.log('\nWAITER USERS:', staff);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
