// src/modules/maintenance/maintenance.controller.js
// Controlador para endpoints de mantenimiento y control de versiones

const maintenanceService = require("./maintenance.service");

const maintenanceController = {
  getStatus: async (req, res, next) => {
    try {
      const status = await maintenanceService.getStatus();
      res.json({ ok: true, data: status });
    } catch (err) {
      next(err);
    }
  },

  startCountdown: async (req, res, next) => {
    try {
      const { countdownSeconds = 30, reason, targetVersion } = req.body;
      const initiatedBy = req.authUser?.id || req.session?.userId || null;
      const status = await maintenanceService.startCountdown({
        countdownSeconds,
        reason,
        targetVersion,
        initiatedBy,
      });
      res.json({ ok: true, data: status, message: 'Cuenta regresiva de mantenimiento iniciada' });
    } catch (err) {
      next(err);
    }
  },

  abortCountdown: async (req, res, next) => {
    try {
      const status = await maintenanceService.abortCountdown();
      res.json({ ok: true, data: status, message: 'Cuenta regresiva cancelada' });
    } catch (err) {
      next(err);
    }
  },

  endMaintenance: async (req, res, next) => {
    try {
      const status = await maintenanceService.endMaintenance();
      res.json({ ok: true, data: status, message: 'Modo mantenimiento desactivado con éxito' });
    } catch (err) {
      next(err);
    }
  },

  getVersions: async (req, res, next) => {
    try {
      const versions = await maintenanceService.getVersions();
      res.json({ ok: true, data: versions });
    } catch (err) {
      next(err);
    }
  },

  createVersion: async (req, res, next) => {
    try {
      const { versionTag, title, changelog } = req.body;
      const releasedBy = req.authUser?.id || req.session?.userId || null;
      const version = await maintenanceService.createVersion({
        versionTag,
        title,
        changelog,
        releasedBy,
      });
      res.json({ ok: true, data: version, message: 'Versión registrada exitosamente' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = maintenanceController;
