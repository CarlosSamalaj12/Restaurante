/**
 * licenseStorage.js
 *
 * Cache cifrado del license token (firmado por el server con HMAC).
 *
 * El token se cifra con AES-GCM usando una clave derivada del serial de la
 * terminal + un salt bundleado. Esto NO es seguridad criptográfica real
 * contra un atacante con acceso al bundle — para eso se necesitaría un
 * helper nativo (DPAPI / Keychain). Pero sube el costo de "abrir
 * DevTools y leer el token en claro" a "abrir DevTools y además
 * entender el código de derivación".
 *
 * La protección real contra falsificación está en la firma HMAC del server
 * y en la verificación online (heartbeat). El cifrado local es sólo para
 * que el token no esté visible trivialmente.
 */

import { getOrCreateSerial } from './terminalSerial';

const STORAGE_KEY = 'v1.license.token.encrypted';
const SALT = 'samapos-license-v1-do-not-change';

// ──────── Key derivation ────────

async function deriveKey() {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(`${getOrCreateSerial()}|${SALT}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ──────── Encrypt / Decrypt ────────

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export async function saveLicenseToken(token) {
  if (!token || typeof token !== 'string') {
    clearLicenseToken();
    return;
  }
  try {
    const key = await deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(token),
    );
    const payload = {
      iv: bufToB64(iv),
      ct: bufToB64(cipherBuf),
      saved_at: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Si falla el cifrado, igualmente lo guardamos en claro (no bloqueamos al usuario)
    console.warn('[licenseStorage] encrypt failed, storing plain:', e?.message);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ plain: token, saved_at: Date.now() }));
  }
}

export async function loadLicenseToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.plain) return data.plain;
    if (!data.iv || !data.ct) return null;
    const key = await deriveKey();
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBuf(data.iv) },
      key,
      b64ToBuf(data.ct),
    );
    return new TextDecoder().decode(plain);
  } catch (e) {
    // La clave de cifrado cambió (rotación de salt) o el storage está corrupto
    console.warn('[licenseStorage] decrypt failed, clearing:', e?.message);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return null;
  }
}

export function clearLicenseToken() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

/**
 * Decodifica el token guardado y devuelve su payload si todavía
 * no venció. NO verifica la firma HMAC — eso lo hace el server en
 * cada heartbeat cuando hay red. Aquí sólo usamos el `expires_at`
 * que viene dentro del token como "offline grace".
 */
export async function loadLicensePayload() {
  const token = await loadLicenseToken();
  if (!token) return null;
  // Formato del token: "body.signature" en base64url
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  try {
    const body = atob(token.slice(0, dot).replace(/-/g, '+').replace(/_/g, '/'));
    const json = decodeURIComponent(escape(body));
    const payload = JSON.parse(json);
    if (typeof payload.expires_at !== 'number') return null;
    if (payload.expires_at < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
