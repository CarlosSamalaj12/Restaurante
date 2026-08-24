/**
 * Sistema de Licencias — SamaPos
 *
 * - Online + offline grace: cuando hay red, server firma un token HMAC
 *   con validez de 7 días. La terminal lo guarda cifrado localmente y,
 *   si se cae la red, lo sigue usando hasta que se venza la gracia.
 * - Revocación: instantánea cuando hay red. Sin red, el token caduca solo.
 * - Identidad: cada terminal genera un UUID v4 al instalar (terminalSerial.js
 *   en el cliente) y lo manda como `X-Terminal-Serial`.
 *
 * El secreto HMAC vive en `LICENSE_HMAC_SECRET` (env). En producción debe
 * ser una cadena aleatoria de al menos 32 bytes. Si no está definido, se
 * usa un default visible SOLO para desarrollo.
 */

const crypto = require('crypto');
const { query } = require('./db');

const LICENSE_HMAC_SECRET =
  process.env.LICENSE_HMAC_SECRET ||
  'dev-only-secret-DO-NOT-USE-IN-PROD-replace-me-please-32b';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días de gracia offline
const HEARTBEAT_STALE_SECONDS = 2 * 60 * 60; // 2 horas sin heartbeat → "stale"

// Rate limit en memoria para /enroll (50 por IP por hora — permisivo para
// permitir recargas del POS durante setup/debug. En producción se puede bajar
// porque la terminal solo debería enrollar UNA vez en su vida).
const ENROLL_RATELIMIT = new Map(); // ip -> [timestamps]
const ENROLL_WINDOW_MS = 60 * 60 * 1000;
const ENROLL_MAX = 50;

// ───────── Dev bypass (máquina del creador) ─────────
// La máquina del creador/desarrollador queda SIEMPRE autorizada, sin
// importar el estado en la BD (pending/revoked) ni la vigencia de la
// licencia. Configuración en .env:
//   LICENSE_DEV_SERIALS=uuid1,uuid2   → lista de seriales exactos
//   LICENSE_DEV_MODE=true             → autoriza CUALQUIER serial
//                                       (solo desarrollo local; nunca en
//                                        un server compartido/producción)
function devBypassSerialList() {
  return String(process.env.LICENSE_DEV_SERIALS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isDevBypass(serial) {
  if (!serial || typeof serial !== 'string') return false;
  const devMode = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.LICENSE_DEV_MODE || '').trim().toLowerCase(),
  );
  if (devMode) return true;
  return devBypassSerialList().includes(serial.trim().toLowerCase());
}

// ───────── Token HMAC ─────────

function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64url');
}
function b64urlDecode(str) {
  return Buffer.from(str, 'base64url');
}

/**
 * Firma un payload JSON y devuelve "body.signature" en base64url.
 */
function signLicenseToken(payload) {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', LICENSE_HMAC_SECRET)
    .update(body)
    .digest();
  return `${body}.${b64urlEncode(sig)}`;
}

/**
 * Verifica firma + parsea. Devuelve el payload o null si es inválido.
 */
function verifyLicenseToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sigStr = token.slice(dot + 1);
  let sig, expected;
  try {
    sig = b64urlDecode(sigStr);
    expected = crypto
      .createHmac('sha256', LICENSE_HMAC_SECRET)
      .update(body)
      .digest();
  } catch {
    return null;
  }
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(sig, expected)) return null;
  try {
    return JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }
}

// ───────── Schema (idempotente) ─────────

async function ensureLicenseTables() {
  // Migración: ampliar columna serial si existe con el tamaño viejo
  try {
    await query(`ALTER TABLE licensed_terminals MODIFY COLUMN serial VARCHAR(128) NOT NULL`);
  } catch (e) {
    // Si la tabla no existe todavía, el CREATE de abajo la crea con el tamaño nuevo
  }

  await query(`
    CREATE TABLE IF NOT EXISTS licenses (
      id              INT PRIMARY KEY AUTO_INCREMENT,
      tier            ENUM('trial','standard') NOT NULL DEFAULT 'trial',
      max_terminals   INT NOT NULL DEFAULT 2,
      valid_from      DATETIME NOT NULL,
      valid_until     DATETIME NULL,
      offline_grace_days INT NOT NULL DEFAULT 7,
      status          ENUM('active','expired','revoked') NOT NULL DEFAULT 'active',
      notes           TEXT,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS licensed_terminals (
      id                  INT PRIMARY KEY AUTO_INCREMENT,
      license_id          INT NULL,
      serial              VARCHAR(128) NOT NULL UNIQUE,
      hostname            VARCHAR(255),
      ip_address          VARCHAR(45),
      os_info             VARCHAR(255),
      terminal_type       ENUM('pos','kds') NOT NULL DEFAULT 'pos',
      label               VARCHAR(255),
      status              ENUM('pending','active','revoked','replaced')
                          NOT NULL DEFAULT 'pending',
      first_seen_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at        DATETIME NULL,
      last_online_at      DATETIME NULL,
      approved_at         DATETIME NULL,
      approved_by_user_id INT NULL,
      INDEX idx_status (status),
      INDEX idx_serial (serial)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS license_audit (
      id            INT PRIMARY KEY AUTO_INCREMENT,
      actor_user_id INT NULL,
      terminal_id   INT NULL,
      license_id    INT NULL,
      action        VARCHAR(50) NOT NULL,
      details       JSON,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

// ───────── Helpers DB ─────────

async function getTerminalBySerial(query, serial) {
  const [rows] = await query(
    `SELECT t.*, l.tier, l.max_terminals, l.valid_from AS lic_valid_from,
            l.valid_until AS lic_valid_until, l.offline_grace_days,
            l.status AS license_status
     FROM licensed_terminals t
     LEFT JOIN licenses l ON l.id = t.license_id
     WHERE t.serial = ?
     LIMIT 1`,
    [serial],
  );
  return rows[0] || null;
}

async function getOrCreateActiveLicense(query) {
  const [rows] = await query(
    `SELECT * FROM licenses WHERE status='active' ORDER BY id ASC LIMIT 1`,
  );
  if (rows[0]) return rows[0];
  // No hay licencia activa → crear trial de 30 días
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [result] = await query(
    `INSERT INTO licenses (tier, max_terminals, valid_from, valid_until, offline_grace_days, status, notes)
     VALUES ('trial', 2, NOW(), ?, 7, 'active', 'Auto-created en primer enroll')`,
    [validUntil],
  );
  const [created] = await query(`SELECT * FROM licenses WHERE id = ?`, [result.insertId]);
  return created[0];
}

/**
 * getOrCreateDevLicense
 * Licencia Standard sin vencimiento (max ilimitado) usada por el
 * dev-bypass del creador. Reutiliza una activa si ya existe una que
 * no expire; si no, la crea.
 */
async function getOrCreateDevLicense(query) {
  const [rows] = await query(
    `SELECT * FROM licenses
     WHERE status = 'active' AND (valid_until IS NULL OR valid_until > NOW())
     ORDER BY id ASC LIMIT 1`,
  );
  if (rows[0]) return rows[0];
  const [r] = await query(
    `INSERT INTO licenses (tier, max_terminals, valid_from, valid_until, offline_grace_days, status, notes)
     VALUES ('standard', 0, NOW(), NULL, 7, 'active', 'Auto-creada por dev-bypass (creador)')`,
  );
  const [created] = await query(`SELECT * FROM licenses WHERE id = ?`, [r.insertId]);
  return created[0];
}

/**
 * upsertTerminalActive
 * Crea (o re-activa) una terminal como `active`, ligada a una licencia
 * Standard sin vencimiento. Se usa para el dev-bypass del creador.
 */
async function upsertTerminalActive(
  query,
  { serial, hostname = null, osInfo = null, terminalType = 'pos', label = null, ip = null },
) {
  const license = await getOrCreateDevLicense(query);
  const [rows] = await query(`SELECT * FROM licensed_terminals WHERE serial = ? LIMIT 1`, [serial]);
  const existing = rows[0];
  let terminal;

  if (existing) {
    const wasActive = existing.status === 'active';
    await query(
      `UPDATE licensed_terminals
       SET status = 'active',
           license_id = ?,
           approved_at = COALESCE(approved_at, NOW()),
           hostname = COALESCE(?, hostname),
           ip_address = COALESCE(?, ip_address),
           os_info = COALESCE(?, os_info),
           terminal_type = COALESCE(?, terminal_type),
           label = COALESCE(?, label)
       WHERE id = ?`,
      [license.id, hostname, ip, osInfo, terminalType, label, existing.id],
    );
    const [updated] = await query(`SELECT * FROM licensed_terminals WHERE id = ?`, [existing.id]);
    terminal = updated[0] || existing;
    if (!wasActive) {
      await writeAudit(query, {
        terminalId: terminal.id,
        licenseId: license.id,
        action: 'terminal.approve',
        details: { via: 'dev-bypass', label: terminal.label },
      });
    }
  } else {
    try {
      const [r] = await query(
        `INSERT INTO licensed_terminals
           (license_id, serial, hostname, ip_address, os_info, terminal_type, label, status, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [license.id, serial, hostname, ip, osInfo, terminalType, label],
      );
      const [created] = await query(`SELECT * FROM licensed_terminals WHERE id = ?`, [r.insertId]);
      terminal = created[0];
      await writeAudit(query, {
        terminalId: terminal.id,
        licenseId: license.id,
        action: 'terminal.enroll',
        details: { via: 'dev-bypass' },
      });
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY') {
        const [dupRows] = await query(`SELECT * FROM licensed_terminals WHERE serial = ? LIMIT 1`, [serial]);
        if (dupRows[0]) {
          terminal = dupRows[0];
          await query(
            `UPDATE licensed_terminals
             SET status = 'active',
                 license_id = ?,
                 approved_at = COALESCE(approved_at, NOW())
             WHERE id = ?`,
            [license.id, terminal.id],
          );
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }
  }
  return { terminal, license };
}

async function countActiveTerminalsForLicense(query, licenseId) {
  const [rows] = await query(
    `SELECT COUNT(*) AS c FROM licensed_terminals
     WHERE license_id = ? AND status='active'`,
    [licenseId],
  );
  return Number(rows[0]?.c || 0);
}

async function writeAudit(query, { actorUserId, terminalId, licenseId, action, details }) {
  await query(
    `INSERT INTO license_audit (actor_user_id, terminal_id, license_id, action, details)
     VALUES (?, ?, ?, ?, ?)`,
    [
      actorUserId || null,
      terminalId || null,
      licenseId || null,
      action,
      details ? JSON.stringify(details) : null,
    ],
  );
}

function clientIp(req) {
  const raw = String(
    req.headers['x-forwarded-for'] || req.ip || '',
  )
    .split(',')[0]
    .trim();
  return raw.replace('::ffff:', '');
}

// Rate limit enroll por IP
function checkEnrollRateLimit(ip) {
  const now = Date.now();
  const list = (ENROLL_RATELIMIT.get(ip) || []).filter(
    (t) => now - t < ENROLL_WINDOW_MS,
  );
  if (list.length >= ENROLL_MAX) return false;
  list.push(now);
  ENROLL_RATELIMIT.set(ip, list);
  return true;
}

// ───────── Endpoints públicos ─────────

function enrollResponse(terminal) {
  return {
    status: terminal.status,
    terminal_id: terminal.id,
    label: terminal.label,
    ip_address: terminal.ip_address,
    first_seen_at: terminal.first_seen_at,
    last_seen_at: terminal.last_seen_at,
    message:
      terminal.status === 'pending'
        ? 'Esperando aprobación del administrador'
        : terminal.status === 'active'
        ? 'Terminal activa'
        : 'Estado: ' + terminal.status,
  };
}

/**
 * POST /api/license/enroll
 * Body: { serial, hostname, os_info, terminal_type, label? }
 * Crea la terminal como `pending`. La activación la hace el admin.
 */
async function enroll(req, res) {
  const ip = clientIp(req);
  if (!checkEnrollRateLimit(ip)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes, intenta más tarde' });
  }
  const serial = String(req.body?.serial || '').trim();
  const terminalType = String(req.body?.terminal_type || 'pos').trim();
  const hostname = String(req.body?.hostname || '').trim().slice(0, 255);
  const osInfo = String(req.body?.os_info || '').trim().slice(0, 255);
  const label = String(req.body?.label || '').trim().slice(0, 255) || null;

  if (!/^[0-9a-fA-F-]{8,64}$/.test(serial)) {
    return res.status(400).json({ error: 'Serial inválido' });
  }
  if (!['pos', 'kds'].includes(terminalType)) {
    return res.status(400).json({ error: 'terminal_type debe ser "pos" o "kds"' });
  }

  // Dev-bypass: la máquina del creador se autoriza sola, sin esperar
  // aprobación del admin y aunque estuviera pending/revoked.
  if (isDevBypass(serial)) {
    try {
      const { terminal, license: devLic } = await upsertTerminalActive(query, {
        serial,
        hostname,
        osInfo,
        terminalType,
        label,
        ip,
      });
      return res.json({
        status: 'active',
        terminal_id: terminal.id,
        label: terminal.label,
        ip_address: terminal.ip_address,
        first_seen_at: terminal.first_seen_at,
        last_seen_at: terminal.last_seen_at,
        license_id: devLic.id,
        dev_bypass: true,
        message: 'Terminal del creador: siempre autorizada',
      });
    } catch (e) {
      console.error('[license.enroll.dev-bypass]', e);
      return res.status(500).json({ error: 'Error en dev-bypass de terminal' });
    }
  }

  try {
    // Si ya existe (mismo serial), actualizamos info y devolvemos estado actual
    // ⚠️ mysql2 devuelve [rows, fields]. rows es SIEMPRE un array; rows[0] es
    // el primer row o undefined si no hay match. ¡Cuidado con `if (rows)` porque
    // `[]` es truthy en JS y se mete en la rama equivocada!
    const [existingRows] = await query(
      `SELECT * FROM licensed_terminals WHERE serial = ? LIMIT 1`,
      [serial],
    );
    const existing = existingRows[0];

    let terminal;
    if (existing) {
      // Si fue reemplazada, mantenemos replaced. Si está revoked, no se puede re-enrollar.
      if (existing.status === 'revoked') {
        return res.status(403).json({
          error: 'Esta terminal fue revocada. Contacta al administrador.',
          status: 'revoked',
        });
      }
      await query(
        `UPDATE licensed_terminals
         SET hostname = ?, ip_address = ?, os_info = ?, terminal_type = ?, label = COALESCE(?, label)
         WHERE id = ?`,
        [hostname, ip, osInfo, terminalType, label, existing.id],
      );
      const [updatedRows] = await query(
        `SELECT * FROM licensed_terminals WHERE id = ?`,
        [existing.id],
      );
      terminal = updatedRows[0] || existing;
    } else {
      let result;
      try {
        [result] = await query(
          `INSERT INTO licensed_terminals
             (serial, hostname, ip_address, os_info, terminal_type, label, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [serial, hostname, ip, osInfo, terminalType, label],
        );
      } catch (e) {
        // Carrera: dos enrolls concurrentes con el mismo serial nuevo (p.ej.
        // dos pestañas o el auto-retry de la pantalla de bloqueo). El otro
        // ganó el INSERT → releer y tratar como terminal existente.
        if (e?.code === 'ER_DUP_ENTRY') {
          const [dupRows] = await query(
            `SELECT * FROM licensed_terminals WHERE serial = ? LIMIT 1`,
            [serial],
          );
          if (!dupRows[0]) throw e;
          terminal = dupRows[0];
          return res.json(enrollResponse(terminal));
        }
        throw e;
      }
      const [createdRows] = await query(
        `SELECT * FROM licensed_terminals WHERE id = ?`,
        [result.insertId],
      );
      terminal = createdRows[0];
      await writeAudit(query, {
        terminalId: terminal.id,
        action: 'terminal.enroll',
        details: { hostname, ip, terminalType },
      });
    }

    return res.json(enrollResponse(terminal));
  } catch (e) {
    console.error('[license.enroll]', e);
    return res.status(500).json({ error: 'Error al registrar terminal' });
  }
}

/**
 * POST /api/license/heartbeat
 * Header: X-Terminal-Serial
 * Devuelve: { ok, status, license_token, license, server_time }
 */
async function heartbeat(req, res) {
  const serial = String(req.headers['x-terminal-serial'] || '').trim();
  if (!serial) {
    return res.status(400).json({ ok: false, reason: 'missing-serial' });
  }
  try {
    let terminal = await getTerminalBySerial(query, serial);
    const devBypass = isDevBypass(serial);

    if (!terminal) {
      if (!devBypass) {
        return res.status(404).json({ ok: false, reason: 'unknown-serial' });
      }
      // La máquina del creador se crea y autoriza sola
      await upsertTerminalActive(query, { serial });
      terminal = await getTerminalBySerial(query, serial);
      if (!terminal) {
        return res.status(500).json({ ok: false, reason: 'dev-bypass-upsert-failed' });
      }
    }

    if (devBypass && terminal.status !== 'active') {
      // La máquina del creador se re-autoriza aunque estuviera pending/revoked
      await upsertTerminalActive(query, { serial });
      terminal = await getTerminalBySerial(query, serial);
    }

    const licValidUntil = terminal.lic_valid_until
      ? new Date(terminal.lic_valid_until)
      : null;

    if (!devBypass) {
      if (terminal.status !== 'active') {
        return res.json({ ok: false, status: terminal.status, reason: terminal.status });
      }
      // Verificar licencia
      if (terminal.license_status !== 'active') {
        return res.json({ ok: false, status: 'license_inactive', reason: 'license-not-active' });
      }
      if (licValidUntil && licValidUntil < new Date()) {
        return res.json({ ok: false, status: 'license_expired', reason: 'license-expired' });
      }
    }

    // OK → actualizar last_seen_at / last_online_at y emitir token
    await query(
      `UPDATE licensed_terminals SET last_seen_at = NOW(), last_online_at = NOW() WHERE id = ?`,
      [terminal.id],
    );

    const now = Math.floor(Date.now() / 1000);
    const tier = devBypass ? 'developer' : terminal.tier;
    const validUntilISO = devBypass ? null : licValidUntil ? licValidUntil.toISOString() : null;
    const tokenPayload = {
      serial: terminal.serial,
      terminal_id: terminal.id,
      terminal_type: terminal.terminal_type,
      label: terminal.label,
      tier,
      max_terminals: terminal.max_terminals,
      lic_valid_from: terminal.lic_valid_from
        ? new Date(terminal.lic_valid_from).toISOString()
        : null,
      lic_valid_until: validUntilISO,
      offline_grace_days: terminal.offline_grace_days,
      issued_at: now,
      expires_at: now + TOKEN_TTL_SECONDS,
    };
    const token = signLicenseToken(tokenPayload);

    return res.json({
      ok: true,
      status: 'active',
      license_token: token,
      server_time: now,
      license: {
        tier,
        max_terminals: terminal.max_terminals,
        valid_until: validUntilISO,
        offline_grace_days: terminal.offline_grace_days,
      },
    });
  } catch (e) {
    console.error('[license.heartbeat]', e);
    return res.status(500).json({ ok: false, reason: 'server-error' });
  }
}

/**
 * GET /api/license/status
 * Header: X-Terminal-Serial
 */
async function status(req, res) {
  const serial = String(req.headers['x-terminal-serial'] || '').trim();
  if (!serial) return res.status(400).json({ error: 'missing-serial' });
  if (isDevBypass(serial)) {
    return res.json({
      status: 'active',
      license_status: 'active',
      label: 'dev-bypass',
      terminal_type: 'pos',
      dev_bypass: true,
    });
  }
  const terminal = await getTerminalBySerial(query, serial);
  if (!terminal) return res.status(404).json({ error: 'unknown-serial' });
  return res.json({
    status: terminal.status,
    license_status: terminal.license_status,
    label: terminal.label,
    terminal_type: terminal.terminal_type,
    last_seen_at: terminal.last_seen_at,
    last_online_at: terminal.last_online_at,
  });
}

// ───────── Middleware ─────────

/**
 * requireLicensedTerminal
 * Verifica header `X-Terminal-Serial`. Si la terminal está activa y la
 * licencia vigente, deja pasar. Si no, 403 con reason.
 *
 * Debe correr DESPUÉS de requireAuth en rutas que requieren sesión.
 */
async function requireLicensedTerminal(req, res, next) {
  const serial = String(req.headers['x-terminal-serial'] || '').trim();
  if (!serial) {
    return res.status(403).json({
      error: 'Terminal no identificada. Falta X-Terminal-Serial.',
      code: 'LICENSE_MISSING_SERIAL',
    });
  }
  // Máquina del creador: siempre autorizada, sin pasar por la BD.
  if (isDevBypass(serial)) {
    req.terminal = { id: null, serial, label: 'dev-bypass', type: 'pos' };
    // Best-effort: dejar la terminal activa en la BD para que el heartbeat
    // y el token offline funcionen normalmente.
    upsertTerminalActive(query, { serial }).catch((e) =>
      console.error('[license.dev-bypass] upsert falló:', e.message),
    );
    return next();
  }
  try {
    const terminal = await getTerminalBySerial(query, serial);
    if (!terminal) {
      return res.status(403).json({
        error: 'Terminal no autorizada',
        code: 'LICENSE_UNKNOWN',
      });
    }
    if (terminal.status !== 'active') {
      return res.status(403).json({
        error: 'Terminal ' + terminal.status,
        code: 'LICENSE_TERMINAL_' + terminal.status.toUpperCase(),
      });
    }
    if (terminal.license_status !== 'active') {
      return res.status(403).json({
        error: 'Licencia no activa',
        code: 'LICENSE_INACTIVE',
      });
    }
    if (terminal.lic_valid_until && new Date(terminal.lic_valid_until) < new Date()) {
      return res.status(403).json({
        error: 'Licencia vencida',
        code: 'LICENSE_EXPIRED',
      });
    }
    // Adjuntar al request para los handlers
    req.terminal = {
      id: terminal.id,
      serial: terminal.serial,
      label: terminal.label,
      type: terminal.terminal_type,
    };
    // Best-effort: actualizar last_seen_at
    query(
      `UPDATE licensed_terminals SET last_seen_at = NOW() WHERE id = ?`,
      [terminal.id],
    ).catch(() => {});
    return next();
  } catch (e) {
    console.error('[license.middleware]', e);
    return res.status(500).json({ error: 'Error validando licencia' });
  }
}

// ───────── Endpoints admin ─────────

/** GET /api/admin/licenses */
async function listLicenses(req, res) {
  const [rows] = await query(
    `SELECT l.*,
            (SELECT COUNT(*) FROM licensed_terminals t
             WHERE t.license_id = l.id AND t.status='active') AS active_terminals
     FROM licenses l
     ORDER BY l.id DESC`,
  );
  return res.json(rows);
}

/** POST /api/admin/licenses */
async function createLicense(req, res) {
  const tier = String(req.body?.tier || 'standard');
  if (!['trial', 'standard'].includes(tier)) {
    return res.status(400).json({ error: 'tier debe ser trial o standard' });
  }
  const maxTerminals = Number(req.body?.max_terminals ?? (tier === 'trial' ? 2 : 0));
  const offlineGraceDays = Number(req.body?.offline_grace_days ?? 7);
  const validUntil = req.body?.valid_until
    ? new Date(req.body.valid_until)
    : tier === 'trial'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const notes = String(req.body?.notes || '').slice(0, 1000) || null;

  try {
    const [result] = await query(
      `INSERT INTO licenses (tier, max_terminals, valid_from, valid_until, offline_grace_days, status, notes)
       VALUES (?, ?, NOW(), ?, ?, 'active', ?)`,
      [tier, maxTerminals, validUntil, offlineGraceDays, notes],
    );
    await writeAudit(query, {
      actorUserId: req.authUser?.id,
      licenseId: result.insertId,
      action: 'license.create',
      details: { tier, max_terminals: maxTerminals, valid_until: validUntil },
    });
    const [rows] = await query(`SELECT * FROM licenses WHERE id = ?`, [result.insertId]);
    return res.json(rows[0]);
  } catch (e) {
    console.error('[license.create]', e);
    return res.status(500).json({ error: 'Error creando licencia' });
  }
}

/** POST /api/admin/licenses/:id/revoke */
async function revokeLicense(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id inválido' });
  const [rows] = await query(`SELECT * FROM licenses WHERE id = ?`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Licencia no encontrada' });
  await query(`UPDATE licenses SET status='revoked' WHERE id = ?`, [id]);
  await query(
    `UPDATE licensed_terminals SET status='revoked' WHERE license_id = ? AND status='active'`,
    [id],
  );
  await writeAudit(query, {
    actorUserId: req.authUser?.id,
    licenseId: id,
    action: 'license.revoke',
    details: { reason: req.body?.reason || null },
  });
  return res.json({ ok: true });
}

/** GET /api/admin/terminals */
async function listTerminals(req, res) {
  const status = String(req.query?.status || '').trim();
  const where = [];
  const params = [];
  if (status) {
    where.push('t.status = ?');
    params.push(status);
  }
  const sql = `
    SELECT t.*, l.tier AS license_tier
    FROM licensed_terminals t
    LEFT JOIN licenses l ON l.id = t.license_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY t.first_seen_at DESC
  `;
  const [rows] = await query(sql, params);
  return res.json(rows);
}

/** POST /api/admin/terminals/:id/approve */
async function approveTerminal(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id inválido' });
  const [rows] = await query(`SELECT * FROM licensed_terminals WHERE id = ?`, [id]);
  const terminal = rows[0];
  if (!terminal) return res.status(404).json({ error: 'Terminal no encontrada' });
  if (terminal.status === 'active') {
    return res.json({ ok: true, message: 'Ya estaba activa' });
  }
  if (!['pending', 'replaced', 'revoked'].includes(terminal.status)) {
    return res.status(400).json({ error: 'Estado no aprobable: ' + terminal.status });
  }

  // Buscar o crear licencia
  let license = await getOrCreateActiveLicense(query);
  // Si la licencia activa está al límite y es trial, exigir upgrade
  if (license.max_terminals > 0) {
    const used = await countActiveTerminalsForLicense(query, license.id);
    if (used >= license.max_terminals) {
      return res.status(409).json({
        error: `La licencia activa (${license.tier}) ya tiene ${used}/${license.max_terminals} terminales. Upgrade a Standard o crea otra licencia.`,
        code: 'LICENSE_FULL',
      });
    }
  }
  // Verificar que la licencia no esté vencida
  if (license.valid_until && new Date(license.valid_until) < new Date()) {
    return res.status(409).json({
      error: 'La licencia activa está vencida. Crea una nueva.',
      code: 'LICENSE_EXPIRED',
    });
  }

  const label = String(req.body?.label || terminal.label || `Terminal ${terminal.id}`).slice(0, 255);
  await query(
    `UPDATE licensed_terminals
     SET status='active', license_id=?, approved_at=NOW(),
         approved_by_user_id=?, label=?
     WHERE id = ?`,
    [license.id, req.authUser?.id || null, label, id],
  );
  await writeAudit(query, {
    actorUserId: req.authUser?.id,
    terminalId: id,
    licenseId: license.id,
    action: 'terminal.approve',
    details: { label, license_tier: license.tier },
  });
  return res.json({ ok: true, license_id: license.id, label });
}

/** POST /api/admin/terminals/:id/revoke */
async function revokeTerminal(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id inválido' });
  const [rows] = await query(`SELECT * FROM licensed_terminals WHERE id = ?`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Terminal no encontrada' });
  await query(`UPDATE licensed_terminals SET status='revoked' WHERE id = ?`, [id]);
  await writeAudit(query, {
    actorUserId: req.authUser?.id,
    terminalId: id,
    action: 'terminal.revoke',
    details: { reason: req.body?.reason || null },
  });
  return res.json({ ok: true });
}

/** POST /api/admin/terminals/:id/replace */
async function replaceTerminal(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'id inválido' });
  const [rows] = await query(`SELECT * FROM licensed_terminals WHERE id = ?`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Terminal no encontrada' });
  await query(`UPDATE licensed_terminals SET status='replaced' WHERE id = ?`, [id]);
  await writeAudit(query, {
    actorUserId: req.authUser?.id,
    terminalId: id,
    action: 'terminal.replace',
    details: { reason: req.body?.reason || null },
  });
  return res.json({ ok: true });
}

/** GET /api/admin/license-audit */
async function getAuditLog(req, res) {
  const limit = Math.min(Number(req.query?.limit) || 100, 500);
  const [rows] = await query(
    `SELECT a.*, u.full_name AS actor_name
     FROM license_audit a
     LEFT JOIN staff_users u ON u.id = a.actor_user_id
     ORDER BY a.id DESC
     LIMIT ?`,
    [limit],
  );
  return res.json(rows);
}

// ───────── Job: expirar licencias vencidas ─────────

async function expireOverdueLicenses() {
  const [result] = await query(
    `UPDATE licenses SET status='expired'
     WHERE status='active' AND valid_until IS NOT NULL AND valid_until < NOW()`,
  );
  if (result.affectedRows > 0) {
    console.log(`[license] ${result.affectedRows} licencia(s) marcada(s) como expired`);
    await query(
      `UPDATE licensed_terminals SET status='revoked'
       WHERE license_id IN (SELECT id FROM licenses WHERE status='expired')
         AND status='active'`,
    );
  }
}

module.exports = {
  // Crypto
  signLicenseToken,
  verifyLicenseToken,
  TOKEN_TTL_SECONDS,
  HEARTBEAT_STALE_SECONDS,
  // Dev bypass (máquina del creador)
  isDevBypass,
  // Schema
  ensureLicenseTables,
  expireOverdueLicenses,
  // Endpoints públicos
  enroll,
  heartbeat,
  status,
  // Middleware
  requireLicensedTerminal,
  // Endpoints admin
  listLicenses,
  createLicense,
  revokeLicense,
  listTerminals,
  approveTerminal,
  revokeTerminal,
  replaceTerminal,
  getAuditLog,
};
