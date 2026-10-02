require('dotenv').config();
const { query } = require('../src/common/db');
const { hashPin } = require('../src/common/pinHash');

async function migrate() {
  console.log('--- Iniciando migración de PINs a 6 dígitos encriptados ---');

  // 1. Ampliar columna pin_code a VARCHAR(255)
  console.log('1. Modificando estructura de columna pin_code...');
  await query('ALTER TABLE staff_users MODIFY COLUMN pin_code VARCHAR(255) NULL');

  // 2. Obtener usuarios actuales
  const [users] = await query('SELECT id, full_name, pin_code, role FROM staff_users');
  console.log(`2. Encontrados ${users.length} usuarios para actualizar.`);

  for (const u of users) {
    let newPinPlain = '';
    const role = String(u.role || '').toLowerCase();

    if (role === 'superadmin' || u.id === 3 || u.full_name?.toLowerCase().includes('carlos')) {
      newPinPlain = '120303';
      console.log(`Asignando PIN solicitado a Superadmin (${u.full_name}): 120303`);
    } else {
      const oldPin = String(u.pin_code || '').trim();
      if (oldPin.length === 4) {
        newPinPlain = oldPin + '00';
      } else if (oldPin.length >= 6) {
        newPinPlain = oldPin.slice(0, 6);
      } else {
        newPinPlain = (oldPin + '000000').slice(0, 6);
      }
      console.log(`Usuario ${u.id} (${u.full_name}): PIN temporal ${newPinPlain}`);
    }

    const hashed = hashPin(newPinPlain);
    await query('UPDATE staff_users SET pin_code = ? WHERE id = ?', [hashed, u.id]);
  }

  // 3. Verificar estado en base de datos
  const [updated] = await query('SELECT id, full_name, role, pin_code FROM staff_users');
  console.log('\n--- Resultado en Base de Datos (PINs encriptados irreversibles) ---');
  for (const row of updated) {
    console.log(`ID ${row.id} | ${row.full_name} (${row.role}): ${row.pin_code.substring(0, 16)}... [Hash 64 chars]`);
  }

  console.log('\n¡Migración completada con éxito!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
