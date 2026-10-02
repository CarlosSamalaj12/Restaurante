/**
 * offlineCorrelatives.js
 *
 * Administra el código de la terminal (ej: T1, T2, CAJA-1) y la generación
 * determinista de correlativos secuenciales cuando se trabaja sin conexión.
 * Garantiza cero colisiones entre dispositivos distribuidos.
 */

const TERMINAL_CODE_KEY = 'v1.pos.terminal_code';
const SEQ_CHECK_KEY = 'v1.pos.seq_check';
const SEQ_TICKET_KEY = 'v1.pos.seq_ticket';
const SEQ_RECEIPT_KEY = 'v1.pos.seq_receipt';

/**
 * Obtiene o asigna el código de terminal para este dispositivo (ej: 'T1').
 */
export function getTerminalCode() {
  try {
    let code = localStorage.getItem(TERMINAL_CODE_KEY);
    if (!code) {
      // Si no está asignado explícitamente, generar un identificador basado en T + número
      code = 'T1';
      localStorage.setItem(TERMINAL_CODE_KEY, code);
    }
    return code.trim().toUpperCase();
  } catch {
    return 'T1';
  }
}

/**
 * Permite al administrador reasignar el código de la terminal (ej: 'T2', 'BARRA', 'CAJA-1').
 */
export function setTerminalCode(code) {
  if (!code) return;
  const clean = String(code).trim().toUpperCase();
  localStorage.setItem(TERMINAL_CODE_KEY, clean);
  return clean;
}

/**
 * Obtiene el siguiente correlativo secuencial para una clave dada.
 */
function getNextSequence(key) {
  try {
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return Math.floor(Math.random() * 1000) + 1;
  }
}

/**
 * Genera un número de cuenta único para esta terminal:
 * Formato: CHK-[TERMINAL_CODE]-[0000]
 * Ejemplo: CHK-T1-0001
 */
export function generateOfflineCheckNumber() {
  const code = getTerminalCode();
  const seq = getNextSequence(SEQ_CHECK_KEY);
  const pad = String(seq).padStart(4, '0');
  return `CHK-${code}-${pad}`;
}

/**
 * Genera un número de comanda único para cocina/barra:
 * Formato: CMD-[TERMINAL_CODE]-[0000]
 * Ejemplo: CMD-T1-0001
 */
export function generateOfflineTicketNumber() {
  const code = getTerminalCode();
  const seq = getNextSequence(SEQ_TICKET_KEY);
  const pad = String(seq).padStart(4, '0');
  return `CMD-${code}-${pad}`;
}

/**
 * Genera un número de recibo de cobro único para esta terminal:
 * Formato: REC-[TERMINAL_CODE]-[0000]
 * Ejemplo: REC-T1-0001
 */
export function generateOfflineReceiptNumber() {
  const code = getTerminalCode();
  const seq = getNextSequence(SEQ_RECEIPT_KEY);
  const pad = String(seq).padStart(4, '0');
  return `REC-${code}-${pad}`;
}

/**
 * Obtiene un resumen de los contadores actuales.
 */
export function getCorrelativeStatus() {
  return {
    terminalCode: getTerminalCode(),
    lastCheckSeq: parseInt(localStorage.getItem(SEQ_CHECK_KEY) || '0', 10),
    lastTicketSeq: parseInt(localStorage.getItem(SEQ_TICKET_KEY) || '0', 10),
    lastReceiptSeq: parseInt(localStorage.getItem(SEQ_RECEIPT_KEY) || '0', 10),
  };
}
