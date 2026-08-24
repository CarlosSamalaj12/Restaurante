/**
 * Aprueba TODAS las terminales pending, ligándolas a la licencia activa.
 *
 * Uso: node bin/approve-all-pending.js
 *
 * Pensado para el primer setup o para limpiar terminales colgadas.
 * En producción el flujo normal es aprobar desde la UI admin.
 */
require('dotenv').config();
const { query } = require('../src/db');

(async () => {
  try {
    const [licRows] = await query(
      "SELECT id, tier, max_terminals FROM licenses WHERE status='active' ORDER BY id ASC LIMIT 1",
    );
    if (!licRows[0]) {
      console.error('[ERROR] No hay licencia activa. Creá una primero:');
      console.error('        node bin/bootstrap-license.js --tier=standard');
      process.exit(1);
    }
    const lic = licRows[0];
    console.log(`[INFO] Licencia activa: #${lic.id} (tier=${lic.tier}, max=${lic.max_terminals})`);

    const [pending] = await query(
      "SELECT id, serial, hostname, label FROM licensed_terminals WHERE status='pending' ORDER BY id ASC",
    );
    if (pending.length === 0) {
      console.log('[OK] No hay terminales pendientes. Nada que aprobar.');
      process.exit(0);
    }

    console.log(`[INFO] ${pending.length} terminal(es) pendiente(s):`);
    pending.forEach((t) => {
      console.log(`       - id=${t.id} serial=${t.serial} label=${t.label || '(sin label)'} host=${t.hostname || '(sin host)'}`);
    });

    // Si la licencia es trial con max_terminals limitado, ver cuántas activas hay
    if (lic.max_terminals > 0) {
      const [activeRows] = await query(
        "SELECT COUNT(*) AS c FROM licensed_terminals WHERE license_id=? AND status='active'",
        [lic.id],
      );
      const active = Number(activeRows[0].c || 0);
      const wouldHave = active + pending.length;
      if (wouldHave > lic.max_terminals) {
        console.warn(`[WARN] Licencia trial: ${active} activas + ${pending.length} nuevas = ${wouldHave} > max ${lic.max_terminals}.`);
        console.warn(`       Se aprobarán solo las primeras ${Math.max(0, lic.max_terminals - active)}.`);
      }
    }

    const [result] = await query(
      "UPDATE licensed_terminals SET status='active', license_id=?, approved_at=NOW() WHERE status='pending'",
      [lic.id],
    );
    console.log(`\n[OK] ${result.affectedRows} terminal(es) aprobada(s).`);

    // Audit log
    for (const t of pending) {
      await query(
        "INSERT INTO license_audit (actor_user_id, terminal_id, license_id, action, details) VALUES (NULL, ?, ?, 'terminal.approve', ?)",
        [t.id, lic.id, JSON.stringify({ via: 'approve-all-pending script' })],
      );
    }
    console.log('[OK] Audit log escrito.');
  } catch (e) {
    console.error('[ERROR]', e.message);
    console.error(e.stack);
    process.exit(1);
  }
  process.exit(0);
})();
