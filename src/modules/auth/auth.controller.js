// src/modules/auth/auth.controller.js
// Controlador HTTP para login, logout y refresco de sesión

const authService = require("./auth.service");
const { clientIp } = require("../../common/utils");

const authController = {
  async pinLogin(req, res) {
    const pin = req.body?.pin;
    const ip = clientIp(req);
    const userAgent = req.headers["user-agent"];

    const result = await authService.pinLogin({ pin, ip, userAgent });
    res.json({
      ok: true,
      user: result.user,
      allowedModules: result.allowedModules,
      authToken: result.authToken,
      token: result.authToken,
    });
  },

  async logout(req, res) {
    const token = String(req.headers["x-auth-token"] || "").trim();
    const result = await authService.logout(token);
    res.json(result);
  },

  async refreshSession(req, res) {
    const token = String(req.headers["x-auth-token"] || "").trim();
    const ip = clientIp(req);
    const userAgent = req.headers["user-agent"];

    const result = await authService.refreshSession(token, { ip, userAgent });
    res.json({
      ok: true,
      user: result.user,
      permissions: result.permissions,
      expiresAt: result.expiresAt,
    });
  },
};

module.exports = authController;
