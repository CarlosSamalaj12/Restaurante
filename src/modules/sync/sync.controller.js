// src/modules/sync/sync.controller.js
// Controlador para endpoints de sincronización offline

const syncService = require("./sync.service");
const { getCorrelativeStatus } = require("../../../react-app/src/lib/offlineCorrelatives"); // Si aplica o fallback

const syncController = {
  async processBatch(req, res, next) {
    try {
      const { items = [], terminalCode = "T1" } = req.body || {};
      const terminalSerial = req.headers["x-terminal-serial"] || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;

      const result = await syncService.processBatch({
        items,
        terminalCode,
        terminalSerial,
        ipAddress,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getSyncHealth(req, res) {
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      offlineSupport: true,
      protocolVersion: "1.0",
    });
  },
};

module.exports = syncController;
