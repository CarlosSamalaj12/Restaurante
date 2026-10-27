// react-app/src/utils/dateUtils.js
// Utilidades seguras de parseo y cálculo de fechas para navegadores WebKit/Safari iOS y Android

/**
 * Convierte de forma segura una fecha de MySQL ('YYYY-MM-DD HH:mm:ss') o ISO
 * a un objeto Date válido en todos los motores de renderizado.
 * Safari en iOS rechaza espacios en new Date('YYYY-MM-DD HH:mm:ss') arrojando 'Invalid Date' / 'NaN'.
 *
 * @param {string|Date|number} dateInput
 * @returns {Date|null}
 */
export function safeParseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  try {
    const safeStr = typeof dateInput === 'string' ? dateInput.trim().replace(' ', 'T') : dateInput;
    const d = new Date(safeStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Retorna los minutos transcurridos desde dateInput hasta el instante actual.
 * Siempre retorna un número entero >= 0, garantizando que nunca sea NaN.
 *
 * @param {string|Date|number} dateInput
 * @returns {number}
 */
export function safeMinutesSince(dateInput) {
  const d = safeParseDate(dateInput);
  if (!d) return 0;
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  return Math.max(0, isNaN(diff) ? 0 : diff);
}

/**
 * Formatea el tiempo transcurrido de forma segura (ej: '25m', '1h 14m').
 * Previene el error 'NaNh NaNm' en móviles.
 *
 * @param {string|Date|number} dateInput
 * @returns {{ text: string, isLong: boolean, minutes: number }}
 */
export function formatElapsedTime(dateInput) {
  if (!dateInput) return { text: '0m', isLong: false, minutes: 0 };
  const d = safeParseDate(dateInput);
  if (!d) return { text: '0m', isLong: false, minutes: 0 };

  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (isNaN(diff)) return { text: '0m', isLong: false, minutes: 0 };

  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  const isLong = hrs >= 24;

  if (hrs === 0) {
    return { text: `${mins}m`, isLong: false, minutes: diff };
  }
  return { text: `${hrs}h ${mins}m`, isLong, minutes: diff };
}

/**
 * Formatea de forma segura una fecha a hora local (ej: '09:45') con fallback.
 *
 * @param {string|Date|number} dateInput
 * @param {string} fallback
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export function safeFormatLocaleTime(dateInput, fallback = '---', options = { hour: '2-digit', minute: '2-digit' }) {
  const d = safeParseDate(dateInput);
  if (!d) return fallback;
  try {
    return d.toLocaleTimeString('es-GT', options);
  } catch {
    return fallback;
  }
}
