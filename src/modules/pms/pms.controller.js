// src/modules/pms/pms.controller.js
// Controlador HTTP para endpoints de integración con Hotel PMS

const pmsService = require("./pms.service");

const pmsController = {
  async getConfig(req, res, next) {
    try {
      const config = await pmsService.getConfig();
      res.json(config);
    } catch (err) {
      next(err);
    }
  },

  async updateConfig(req, res, next) {
    try {
      const updated = await pmsService.updateConfig(req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async lookupRoom(req, res, next) {
    try {
      const { query } = req.query;
      const data = await pmsService.lookupRoom(query);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async postCharge(req, res, next) {
    try {
      const result = await pmsService.postCharge(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async reverseCharge(req, res, next) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body || {};
      const result = await pmsService.reverseCharge(transactionId, reason);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async testConnection(req, res, next) {
    try {
      const result = await pmsService.testConnection();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getRecentCharges(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 25;
      const history = await pmsService.getRecentCharges(limit);
      res.json(history);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = pmsController;
