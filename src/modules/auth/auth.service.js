// src/modules/auth/auth.service.js
// Lógica de negocio para autenticación, sesiones y control de acceso

const crypto = require("crypto");
const authRepository = require("./auth.repository");
const {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
} = require("../../common/errors");

const AUTH_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
const authSessionsCache = new Map(); // token -> { userId, role, permissions, expiresAt }

const LOGIN_ATTEMPTS_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const loginFailedAttempts = new Map(); // ip/key -> [timestamps]

function checkLoginRateLimit(key) {
  if (!key) return true;
  const now = Date.now();
  const attempts = (loginFailedAttempts.get(key) || []).filter(
    (t) => now - t < LOGIN_ATTEMPTS_WINDOW_MS
  );
  if (attempts.length >= MAX_FAILED_LOGIN_ATTEMPTS) {
    loginFailedAttempts.set(key, attempts);
    return false;
  }
  return true;
}

function recordFailedLogin(key) {
  if (!key) return;
  const now = Date.now();
  const attempts = (loginFailedAttempts.get(key) || []).filter(
    (t) => now - t < LOGIN_ATTEMPTS_WINDOW_MS
  );
  attempts.push(now);
  loginFailedAttempts.set(key, attempts);
}

function clearFailedLogins(key) {
  if (key) loginFailedAttempts.delete(key);
}

const authService = {
  /**
   * Crea una nueva sesión para un usuario autenticado.
   */
  async createAuthSession(user, meta = {}) {
    const token = crypto.randomUUID();
    let permissions = [];
    try {
      permissions = await authRepository.getUserPermissions(Number(user.id));
    } catch (_) {}

    const expiresAt = Date.now() + AUTH_SESSION_TTL_MS;
    const session = {
      userId: Number(user.id),
      role: String(user.role || ""),
      permissions,
      expiresAt,
    };

    // Cache en memoria
    authSessionsCache.set(token, session);

    // Persistencia en DB (sobrevive reinicios)
    try {
      await authRepository.insertSession({
        token,
        userId: session.userId,
        role: session.role,
        permissionsJson: JSON.stringify(permissions || []),
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    } catch (e) {
      console.warn("[auth.service] No se pudo persistir sesión en DB:", e.message);
    }

    return token;
  },

  /**
   * Recupera una sesión validando expiración en memoria o DB fallback.
   */
  async getAuthSession(token) {
    if (!token || typeof token !== "string") return null;
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    // 1) Cache en memoria
    let session = authSessionsCache.get(cleanToken);
    if (session) {
      if (Date.now() > Number(session.expiresAt || 0)) {
        authSessionsCache.delete(cleanToken);
        authRepository.deleteSessionByToken(cleanToken).catch(() => {});
        return null;
      }
      return session;
    }

    // 2) DB fallback
    try {
      const row = await authRepository.findSessionByToken(cleanToken);
      if (!row) return null;

      const expiresAt = Number(row.expires_ms || 0);
      if (Date.now() > expiresAt) {
        authRepository.deleteSessionByToken(cleanToken).catch(() => {});
        return null;
      }

      let permissions = [];
      try {
        permissions = row.permissions_json ? JSON.parse(row.permissions_json) : [];
      } catch (_) {
        permissions = [];
      }

      session = {
        userId: Number(row.user_id),
        role: String(row.role || ""),
        permissions,
        expiresAt,
      };

      authSessionsCache.set(cleanToken, session);
      return session;
    } catch (e) {
      return null;
    }
  },

  /**
   * Elimina una sesión activa.
   */
  async deleteAuthSession(token) {
    if (!token) return;
    authSessionsCache.delete(token);
    try {
      await authRepository.deleteSessionByToken(token);
    } catch (_) {}
  },

  /**
   * Inicia sesión con PIN de empleado.
   */
  async pinLogin({ pin, ip, userAgent }) {
    const clientKey = String(ip || "unknown").trim();
    if (!checkLoginRateLimit(clientKey)) {
      throw new TooManyRequestsError("Demasiados intentos fallidos de PIN. Por favor espere 1 minuto antes de reintentar.");
    }

    const cleanPin = String(pin || "").trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      throw new BadRequestError("El PIN debe tener exactamente 6 dígitos numéricos");
    }

    const user = await authRepository.findUserByPin(cleanPin);
    if (!user) {
      recordFailedLogin(clientKey);
      throw new ForbiddenError("Contraseña inválida");
    }

    // Login exitoso: limpiar intentos fallidos previos
    clearFailedLogins(clientKey);

    const permissions = await authRepository.getUserPermissions(Number(user.id));
    const allowedModules = await this.getAllowedModulesForContext(user, ip);
    const authToken = await this.createAuthSession(user, { ip, userAgent });

    return {
      user: {
        ...user,
        permissions,
      },
      allowedModules,
      authToken,
    };
  },

  /**
   * Cierra sesión del token actual.
   */
  async logout(token) {
    await this.deleteAuthSession(token);
    return { ok: true };
  },

  /**
   * Refresca una sesión existente recalculando permisos y extendiendo vigencia.
   */
  async refreshSession(token, meta = {}) {
    const session = await this.getAuthSession(token);
    if (!session) {
      throw new UnauthorizedError("Sesión inválida o expirada");
    }

    const user = await authRepository.findUserById(session.userId);
    if (!user) {
      await this.deleteAuthSession(token);
      throw new UnauthorizedError("Usuario no encontrado");
    }

    const permissions = await authRepository.getUserPermissions(user.id);
    const expiresAt = Date.now() + AUTH_SESSION_TTL_MS;

    const newSession = {
      userId: Number(user.id),
      role: String(user.role || ""),
      permissions,
      expiresAt,
    };

    authSessionsCache.set(token, newSession);

    try {
      await authRepository.insertSession({
        token,
        userId: newSession.userId,
        role: newSession.role,
        permissionsJson: JSON.stringify(permissions || []),
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    } catch (_) {}

    return {
      user: {
        ...user,
        permissions,
      },
      permissions,
      expiresAt,
    };
  },

  /**
   * Calcula los módulos permitidos para el usuario y la terminal IP.
   */
  async getAllowedModulesForContext(user, ip) {
    const activeModules = await authRepository.getActiveModules();
    const activeCodes = activeModules.map((m) => String(m.code));

    // Permisos por usuario
    const userRows = await authRepository.getUserEnabledModuleCodes(user.id);
    let userAllowed = [];
    if (userRows.length) {
      const enabled = new Set(
        userRows.filter((r) => Number(r.is_enabled) === 1).map((r) => String(r.module_code || "").trim())
      );
      userAllowed = activeCodes.filter((code) => enabled.has(code));
    } else {
      userAllowed = String(user.role || "") === "admin" ? [...activeCodes] : (activeCodes.includes("restaurant") ? ["restaurant"] : []);
    }

    // Permisos por terminal IP
    const devRows = await authRepository.getDeviceEnabledModuleCodes(ip);
    let deviceAllowed = [];
    if (devRows.length) {
      const enabled = new Set(
        devRows.filter((r) => Number(r.is_enabled) === 1).map((r) => String(r.module_code || "").trim())
      );
      deviceAllowed = activeCodes.filter((code) => enabled.has(code));
    } else {
      deviceAllowed = activeCodes.includes("restaurant") ? ["restaurant"] : [];
    }

    const finalSet = new Set(deviceAllowed);
    return activeModules.filter((m) => userAllowed.includes(String(m.code)) && finalSet.has(String(m.code)));
  },

  hasPermission(session, slug) {
    if (!session) return false;
    const role = String(session.role || "").toLowerCase();
    if (role === "superadmin") return true;
    if (role === "admin") {
      // Los permisos técnicos sensibles están reservados exclusivamente para superadmin
      const superadminSlugs = [
        "settings.printers",
        "settings.terminals",
        "settings.licenses",
        "settings.users",
        "settings.roles",
        "settings.production_centers",
        "settings.routing",
        "settings.payments",
        "settings.fel",
        "settings.system",
      ];
      if (superadminSlugs.includes(slug)) return false;
      return true;
    }
    return Array.isArray(session.permissions) && session.permissions.includes(slug);
  },

  // ─── Middlewares de Autorización ───

  requireAuth() {
    return async (req, res, next) => {
      try {
        const token = String(req.headers["x-auth-token"] || req.query?.token || "").trim();
        const session = await authService.getAuthSession(token);
        if (!session) {
          throw new UnauthorizedError("Sesión inválida o vencida");
        }
        req.session = session;
        next();
      } catch (err) {
        next(err);
      }
    };
  },

  requireAdmin() {
    return async (req, res, next) => {
      try {
        const token = String(req.headers["x-auth-token"] || req.query?.token || "").trim();
        const session = await authService.getAuthSession(token);
        if (!session) {
          throw new UnauthorizedError("Sesión inválida o vencida");
        }
        const user = await authRepository.findUserById(session.userId);
        if (!user) {
          throw new UnauthorizedError("Usuario no encontrado");
        }
        const role = String(user.role || "").toLowerCase();
        if (role !== "admin" && role !== "superadmin" && role !== "manager") {
          throw new ForbiddenError("Solo un administrador o supervisor puede acceder a esta sección");
        }
        req.session = session;
        req.authUser = user;
        next();
      } catch (err) {
        next(err);
      }
    };
  },

  requireSuperadmin() {
    return async (req, res, next) => {
      try {
        const token = String(req.headers["x-auth-token"] || req.query?.token || "").trim();
        const session = await authService.getAuthSession(token);
        if (!session) {
          throw new UnauthorizedError("Sesión inválida o vencida");
        }
        const user = await authRepository.findUserById(session.userId);
        if (!user) {
          throw new UnauthorizedError("Usuario no encontrado");
        }
        const role = String(user.role || "").toLowerCase();
        if (role !== "superadmin") {
          throw new ForbiddenError("Acceso exclusivo para Superadministrador");
        }
        req.session = session;
        req.authUser = user;
        next();
      } catch (err) {
        next(err);
      }
    };
  },

  requirePermission(slug) {
    return async (req, res, next) => {
      try {
        const token = String(req.headers["x-auth-token"] || req.query?.token || "").trim();
        const session = await authService.getAuthSession(token);
        if (!session) {
          throw new UnauthorizedError("Sesión inválida o vencida");
        }
        if (!authService.hasPermission(session, slug)) {
          throw new ForbiddenError(`No tienes el permiso requerido: ${slug}`);
        }
        req.session = session;
        next();
      } catch (err) {
        next(err);
      }
    };
  },

  requirePermissionOrSupervisor(slug) {
    return async (req, res, next) => {
      try {
        const token = String(req.headers["x-auth-token"] || req.query?.token || "").trim();
        const session = await authService.getAuthSession(token);
        if (!session) {
          throw new UnauthorizedError("Sesión inválida o vencida");
        }
        req.session = session;

        if (authService.hasPermission(session, slug)) {
          return next();
        }

        const pin = req.body?.authPin || req.body?.supervisorPin || req.headers["x-supervisor-pin"];
        if (pin) {
          const ordersRepository = require("../orders/orders.repository");
          const authResult = await ordersRepository.findManagerOrAdminByPin(String(pin).trim());
          if (authResult && authResult.ok) {
            req.user = req.user || {};
            req.user.id = authResult.user.id;
            req.authorizedBySupervisor = authResult.user;
            return next();
          } else {
            return res.status(403).json({
              ok: false,
              code: "FORBIDDEN",
              message: authResult?.message || "PIN de supervisor inválido o no autorizado",
            });
          }
        }

        throw new ForbiddenError(`No tienes el permiso requerido: ${slug}. Se requiere autorización de supervisor.`);
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = authService;
