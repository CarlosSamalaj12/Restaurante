// src/modules/tables/tables.controller.js
// Controlador HTTP para mesas y áreas

const tablesService = require("./tables.service");
const asyncHandler = require("../../common/asyncHandler");

const tablesController = {
  getTables: asyncHandler(async (req, res) => {
    const centerId = Number(req.query.centerId || "0");
    const tables = await tablesService.getTables(centerId);
    res.json(tables);
  }),

  createTable: asyncHandler(async (req, res) => {
    const result = await tablesService.createTable(req.body || {});
    res.status(201).json(result);
  }),

  updateTable: asyncHandler(async (req, res) => {
    const result = await tablesService.updateTable(req.params.tableId, req.body || {});
    res.json(result);
  }),

  deleteTable: asyncHandler(async (req, res) => {
    const result = await tablesService.deleteTable(req.params.tableId);
    res.json(result);
  }),

  createArea: asyncHandler(async (req, res) => {
    const result = await tablesService.createArea(req.body || {});
    res.status(201).json(result);
  }),

  updateArea: asyncHandler(async (req, res) => {
    const result = await tablesService.updateArea(req.params.areaId, req.body || {});
    res.json(result);
  }),
};

module.exports = tablesController;
