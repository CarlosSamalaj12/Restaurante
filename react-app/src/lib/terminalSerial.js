/**
 * terminalSerial.js
 *
 * Genera / lee el número de serie único de esta terminal.
 *
 * ⚠️ Limitación importante: como el POS corre en un navegador, el serial
 * vive en localStorage. Un atacante con acceso a la máquina puede
 * editarlo. Para mayor seguridad en producción, envolver la app en
 * Electron / Tauri y guardar el serial en una ruta del sistema
 * (C:\ProgramData\SamaPos\terminal.serial) con un helper nativo.
 *
 * Aun así, este esquema cubre:
 *  - Que el usuario no pueda simplemente "borrar la app y reinstalar"
 *    para saltarse el periodo de prueba (el serial se queda).
 *  - Que un serial válido no se pueda usar en dos máquinas a la vez
 *    (el server detecta el cambio de IP/hostname).
 *  - Que sin un serial aprobado, el server rechace todas las requests.
 */

const STORAGE_KEY = 'v1.terminal.serial';
const HOSTNAME_KEY = 'v1.terminal.hostname';

function isValidSerial(s) {
  return typeof s === 'string' && /^[0-9a-fA-F-]{8,64}$/.test(s);
}

function generateSerial() {
  // crypto.randomUUID() está disponible en navegadores modernos
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback manual
  const bytes = new Uint8Array(16);
  (crypto || window.crypto).getRandomValues(bytes);
  // Forzar versión 4 y variante 10xx
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateSerial() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (isValidSerial(existing)) return existing;
    const fresh = generateSerial();
    localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage no disponible (modo privado en algunos browsers)
    return generateSerial();
  }
}

export function getHostname() {
  try {
    const cached = localStorage.getItem(HOSTNAME_KEY);
    if (cached) return cached;
    // En un navegador, no podemos leer el hostname de la máquina.
    // Usamos lo que reporta el navegador + un derivado de la hora (estable).
    const ua = (navigator.userAgent || 'unknown').slice(0, 100);
    const lang = navigator.language || '';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const stableHint = `${navigator.platform || ''}|${ua}|${lang}|${tz}`;
    const stable = btoa(stableHint).slice(0, 40);
    localStorage.setItem(HOSTNAME_KEY, stable);
    return stable;
  } catch {
    return 'browser-unknown';
  }
}

export function getOSInfo() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || 'unknown';
  return `${platform} | ${ua.slice(0, 180)}`;
}
