/**
 * Almacenamiento del token de autenticación.
 *
 * IMPORTANTE — Riesgo XSS:
 *   Hoy el token vive en `localStorage` para que React pueda leerlo y mandarlo
 *   como header `X-Auth-Token`. Eso significa que cualquier XSS lo puede
 *   exfiltrar. Para un POS que maneja pagos esto es un riesgo real.
 *
 *   La solución correcta es server-side: que el endpoint `/auth/pin-login`
 *   responda con `Set-Cookie: authToken=...; HttpOnly; Secure; SameSite=Strict`
 *   y dejar que el browser la envíe automáticamente. Cuando se haga esa
 *   migración en el server, sólo hay que cambiar las 3 funciones de abajo a
 *   no hacer nada en JS (el browser adjunta la cookie sola vía `credentials:
 *   'include'` en `fetch`).
 *
 * Mientras tanto, este módulo:
 *   - Versiona las keys (`v1.*`) para poder migrar sin pisar datos.
 *   - Centraliza el acceso para que el cambio a cookies sea un solo punto.
 *   - Centraliza el `removeAll` en logout (antes había 4 keys sueltas en
 *     api.js, useAuth.jsx y Login.jsx).
 */

const KEYS = {
  token: 'v1.auth.token',
  user: 'v1.auth.user',
  terminal: 'v1.auth.terminal',
};

export const tokenStorage = {
  getToken() {
    try {
      return localStorage.getItem(KEYS.token) || '';
    } catch {
      return '';
    }
  },
  setToken(token) {
    try {
      localStorage.setItem(KEYS.token, token);
    } catch {
      /* private mode / quota / etc */
    }
  },
  clearToken() {
    try {
      localStorage.removeItem(KEYS.token);
    } catch {
      /* noop */
    }
  },

  getUser() {
    try {
      const raw = localStorage.getItem(KEYS.user);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    try {
      localStorage.setItem(KEYS.user, JSON.stringify(user));
    } catch {
      /* noop */
    }
  },
  clearUser() {
    try {
      localStorage.removeItem(KEYS.user);
    } catch {
      /* noop */
    }
  },

  getTerminal() {
    try {
      const raw = localStorage.getItem(KEYS.terminal);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setTerminal(terminal) {
    try {
      localStorage.setItem(KEYS.terminal, JSON.stringify(terminal));
    } catch {
      /* noop */
    }
  },
  clearTerminal() {
    try {
      localStorage.removeItem(KEYS.terminal);
    } catch {
      /* noop */
    }
  },

  /** Llamar en logout. Limpia TODO lo relacionado a la sesión. */
  clearAll() {
    this.clearToken();
    this.clearUser();
    this.clearTerminal();
  },

  /** Migración one-shot desde keys viejas sin versión. */
  migrateLegacy() {
    try {
      const legacy = {
        'v1.auth.token': localStorage.getItem('authToken'),
        'v1.auth.user': localStorage.getItem('authUser'),
        'v1.auth.terminal': localStorage.getItem('selectedTerminal'),
      };
      let migrated = false;
      for (const [newKey, oldValue] of Object.entries(legacy)) {
        if (oldValue !== null && localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, oldValue);
          migrated = true;
        }
        // Borra la key vieja sin importar si tenía valor
        const oldKey = ({
          'v1.auth.token': 'authToken',
          'v1.auth.user': 'authUser',
          'v1.auth.terminal': 'selectedTerminal',
        })[newKey];
        if (localStorage.getItem(oldKey) !== null) {
          localStorage.removeItem(oldKey);
          migrated = true;
        }
      }
      return migrated;
    } catch {
      return false;
    }
  },
};
