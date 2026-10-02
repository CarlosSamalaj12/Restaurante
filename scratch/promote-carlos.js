const { query } = require('../src/common/db');

async function main() {
  // Promote Carlos Samalaj (id 3 / pin 1203) to superadmin
  await query("UPDATE staff_users SET role = 'superadmin' WHERE id = 3 OR full_name LIKE '%Carlos Samalaj%'");
  await query("INSERT IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM staff_users u, roles r WHERE (u.id = 3 OR u.full_name LIKE '%Carlos Samalaj%') AND r.slug = 'superadmin'");
  
  // Update all active auth_sessions for Carlos Samalaj to superadmin
  await query("UPDATE auth_sessions SET role = 'superadmin' WHERE user_id = 3");
  
  // Set Administrador (id 7) to PIN 1234 with role admin
  await query("UPDATE staff_users SET pin_code = '1234', role = 'admin' WHERE id = 7");
  await query("INSERT IGNORE INTO user_roles (user_id, role_id) SELECT 7, r.id FROM roles r WHERE r.slug = 'admin'");

  // Revert Mesero 1 (id 1) back to waiter
  await query("UPDATE staff_users SET role = 'waiter' WHERE id = 1 AND full_name LIKE '%Mesero%'");
  await query("DELETE FROM user_roles WHERE user_id = 1 AND role_id IN (SELECT id FROM roles WHERE slug = 'superadmin')");

  const [users] = await query('SELECT id, full_name, pin_code, role FROM staff_users WHERE id IN (1, 2, 3, 7)');
  console.log('USERS:', JSON.stringify(users, null, 2));

  const [sessions] = await query('SELECT token, user_id, role FROM auth_sessions');
  console.log('SESSIONS:', JSON.stringify(sessions, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
