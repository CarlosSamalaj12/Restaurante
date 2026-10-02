// src/modules/fel/fel.controller.js
// Controlador HTTP para endpoints de facturación electrónica FEL

const felService = require("./fel.service");

const felController = {
  async getConfig(req, res, next) {
    try {
      const data = await felService.getConfig();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async updateConfig(req, res, next) {
    try {
      const data = await felService.updateConfig(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async testConnection(req, res, next) {
    try {
      const result = await felService.testConnection(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async consultarNit(req, res, next) {
    try {
      const result = await felService.consultarNit(req.params.nit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async emitirFactura(req, res, next) {
    try {
      const invoice = await felService.emitirFactura(req.body);
      res.json({ success: true, invoice });
    } catch (err) {
      next(err);
    }
  },

  async getAccountInvoice(req, res, next) {
    try {
      const invoice = await felService.getAccountInvoice(req.params.accountId);
      res.json({ invoice });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = felController;
