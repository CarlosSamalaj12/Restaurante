/**
 * Migración: agregar operation_center_id a accounts
 * Ejecutar con: node db/migrate_accounts_add_center.js
 */
const db = require('../src/db');

async function migrate() {
  console.log('Verificando columna operation_center_id en accounts...');
  
  try {
    // 1. Verificar si la columna ya existe
    const [cols] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'accounts' 
        AND COLUMN_NAME = 'operation_center_id'
    `);
    
    if (cols.length > 0) {
      console.log('✓ La columna operation_center_id ya existe. Nada que hacer.');
      return;
    }

    // 2. Agregar la columna
    console.log('Agregando columna operation_center_id...');
    await db.query(`
      ALTER TABLE accounts
      ADD COLUMN operation_center_id INT NOT NULL DEFAULT 1
      AFTER table_id
    `);
    console.log('✓ Columna agregada.');

    // 3. Agregar FK si la tabla operation_centers existe
    try {
      await db.query(`
        ALTER TABLE accounts
        ADD CONSTRAINT fk_account_center
        FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
      `);
      console.log('✓ Foreign key agregado.');
    } catch (fkErr) {
      console.log('⚠ No se pudo agregar FK (posiblemente operation_centers no existe):', fkErr.message);
    }

    // 4. Asegurar que hay un operation center default
    try {
      const [centers] = await db.query('SELECT COUNT(*) as c FROM operation_centers');
      if (centers[0].c === 0) {
        await db.query("INSERT INTO operation_centers (name, code, type, is_active) VALUES ('Principal', 'MAIN', 'kitchen', 1)");
        console.log('✓ Centro de operación default creado.');
      }
    } catch (e) {
      console.log('⚠ No se pudo crear operation center:', e.message);
    }

    // 5. Actualizar cuentas existentes para que apunten al centro 1
    await db.query('UPDATE accounts SET operation_center_id = 1 WHERE operation_center_id IS NULL OR operation_center_id = 0');
    console.log('✓ Cuentas existentes actualizadas.');

    console.log('\n✅ Migración completada.');
  } catch (err) {
    console.error('Error en migración:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
