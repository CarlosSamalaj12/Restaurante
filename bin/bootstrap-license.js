#!/usr/bin/env node
/**
 * bootstrap-license.js
 *
 * Uso:
 *   node bin/bootstrap-license.js [<serial>] [--tier=standard] [--label="Mi POS"]
 *
 * Crea una licencia Standard (o Trial) y aprueba una terminal para que puedas
 * iniciar el sistema por primera vez. Si no pasas serial, sólo crea la
 * licencia y deja el sistema en "esperando primera terminal".
 *
 * Variables de entorno equivalentes:
 *   LICENSE_BOOTSTRAP_SERIAL  → serial de la terminal a aprobar
 *   LICENSE_BOOTSTRAP_TIER    → 'standard' (default) o 'trial'
 *   LICENSE_BOOTSTRAP_LABEL   → etiqueta opcional
 */

require('dotenv').config();
const { query } = require('../src/db');
const license = require('../src/license');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { serial: process.env.LICENSE_BOOTSTRAP_SERIAL || null, tier: process.env.LICENSE_BOOTSTRAP_TIER || 'standard', label: process.env.LICENSE_BOOTSTRAP_LABEL || null };
  for (const a of args) {
    const m = a.match(/^--(\w+)=(.+)$/);
    if (m) opts[m[1]] = m[2];
    else if (!opts.serial) opts.serial = a;
  }
  return opts;
}

async function main() {
  const opts = parseArgs();

  if (!['trial', 'standard'].includes(opts.tier)) {
    console.error(`[bootstrap] tier inválido: ${opts.tier}. Usa "trial" o "standard".`);
    process.exit(1);
  }

  console.log(`[bootstrap] Asegurando tablas...`);
  await license.ensureLicenseTables();

  // ¿Ya hay licencia activa?
  const [existing] = await query(`SELECT * FROM licenses WHERE status='active' ORDER BY id ASC LIMIT 1`);
  let lic = existing[0];
  if (lic) {
    console.log(`[bootstrap] Ya existe licencia activa #${lic.id} (tier=${lic.tier}, max=${lic.max_terminals})`);
  } else {
    const validUntil = opts.tier === 'trial'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;
    const max = opts.tier === 'trial' ? 2 : 0;
    const [r] = await query(
      `INSERT INTO licenses (tier, max_terminals, valid_from, valid_until, offline_grace_days, status, notes)
       VALUES (?, ?, NOW(), ?, 7, 'active', 'Bootstrap inicial')`,
      [opts.tier, max, validUntil],
    );
    const [created] = await query(`SELECT * FROM licenses WHERE id = ?`, [r.insertId]);
    lic = created[0];
    console.log(`[bootstrap] Licencia creada #${lic.id} (tier=${lic.tier}, max=${lic.max_terminals || 'ilimitado'})`);
  }

  if (!opts.serial) {
    console.log('[bootstrap] No se proporcionó serial. Licencia lista. La próxima terminal que se enrolle quedará como pending hasta que la apruebes desde la UI.');
    process.exit(0);
  }

  // Validar formato del serial
  if (!/^[0-9a-fA-F-]{8,128}$/.test(opts.serial)) {
    console.error(`[bootstrap] Serial con formato inválido: "${opts.serial}"`);
    console.error('  Un UUID v4 se ve así: 8f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c');
    console.error('  Verificá que copiaste solo un UUID, no concatenaste dos.');
    process.exit(1);
  }

  // Aprobar el serial indicado
  const [terms] = await query(`SELECT * FROM licensed_terminals WHERE serial = ? LIMIT 1`, [opts.serial]);
  let terminal;
  if (terms[0]) {
    terminal = terms[0];
    if (terminal.status === 'active') {
      console.log(`[bootstrap] Terminal #${terminal.id} (serial=${opts.serial}) ya estaba activa.`);
    } else {
      const label = opts.label || terminal.label || `Admin ${opts.serial.slice(0, 8)}`;
      await query(
        `UPDATE licensed_terminals
         SET status='active', license_id=?, approved_at=NOW(), label=?
         WHERE id = ?`,
        [lic.id, label, terminal.id],
      );
      await query(
        `INSERT INTO license_audit (actor_user_id, terminal_id, license_id, action, details)
         VALUES (NULL, ?, ?, 'terminal.bootstrap', JSON_OBJECT('reason', 'first-time-setup'))`,
        [terminal.id, lic.id],
      );
      console.log(`[bootstrap] Terminal #${terminal.id} aprobada y ligada a licencia #${lic.id}.`);
    }
  } else {
    const label = opts.label || `Admin ${opts.serial.slice(0, 8)}`;
    const [r] = await query(
      `INSERT INTO licensed_terminals
         (license_id, serial, hostname, ip_address, os_info, terminal_type, label, status, approved_at)
       VALUES (?, ?, NULL, NULL, ?, 'pos', ?, 'active', NOW())`,
      [lic.id, opts.serial, 'bootstrap-cli', label],
    );
    const [created] = await query(`SELECT * FROM licensed_terminals WHERE id = ?`, [r.insertId]);
    terminal = created[0];
    await query(
      `INSERT INTO license_audit (actor_user_id, terminal_id, license_id, action, details)
       VALUES (NULL, ?, ?, 'terminal.bootstrap', JSON_OBJECT('reason', 'first-time-setup'))`,
      [terminal.id, lic.id],
    );
    console.log(`[bootstrap] Terminal #${terminal.id} creada y aprobada (serial=${opts.serial}).`);
  }

  console.log('\nListo. Ahora puedes:');
  console.log('  1. Iniciar el server: npm start');
  console.log('  2. Abrir el POS en la máquina con ese serial — entrará directo al login.');
  console.log('  3. Las próximas terminales se enrolarán como pending y podrás aprobarlas desde Settings → Licencias.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[bootstrap] Error:', e);
  process.exit(1);
});
