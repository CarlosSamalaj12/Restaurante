// src/modules/settings/staff/staff.controller.js
// Controlador HTTP para Personal, Roles, Permisos y Módulos

const asyncHandler = require("../../../common/asyncHandler");
const staffService = require("./staff.service");
const { clientIp } = require("../../../common/utils");

const staffController = {
  updateUserModules: asyncHandler(async (req, res) => {
    const result = await staffService.updateUserModules(
      req.body?.userId,
      req.body?.moduleCodes
    );
    res.json(result);
  }),

  updateDeviceModules: asyncHandler(async (req, res) => {
    const ip = String(req.body?.ipAddress || clientIp(req) || "").trim();
    const result = await staffService.updateDeviceModules(ip, req.body?.moduleCodes);
    res.json(result);
  }),

  getRoles: asyncHandler(async (_req, res) => {
    const data = await staffService.getRoles();
    res.json(data);
  }),

  createRole: asyncHandler(async (req, res) => {
    const result = await staffService.createRole(req.body || {});
    res.status(201).json(result);
  }),

  updateRole: asyncHandler(async (req, res) => {
    const result = await staffService.updateRole(req.params.roleId, req.body || {});
    res.json(result);
  }),

  deleteRole: asyncHandler(async (req, res) => {
    const result = await staffService.deleteRole(req.params.roleId);
    res.json(result);
  }),

  setRolePermissions: asyncHandler(async (req, res) => {
    const result = await staffService.setRolePermissions(
      req.params.roleId,
      req.body?.permissionIds,
      req.body?.defaultView
    );
    res.json(result);
  }),

  setUserRoles: asyncHandler(async (req, res) => {
    const result = await staffService.setUserRoles(
      req.params.userId,
      req.body?.roleIds
    );
    res.json(result);
  }),

  createStaffUser: asyncHandler(async (req, res) => {
    const result = await staffService.createStaffUser(req.body || {});
    res.status(201).json(result);
  }),

  updateStaffUser: asyncHandler(async (req, res) => {
    const result = await staffService.updateStaffUser(
      req.params.userId,
      req.body || {}
    );
    res.json(result);
  }),

  deleteStaffUser: asyncHandler(async (req, res) => {
    const result = await staffService.deleteStaffUser(req.params.userId);
    res.json(result);
  }),

  setStaffUserCenter: asyncHandler(async (req, res) => {
    const result = await staffService.setStaffUserCenter(
      req.params.userId,
      req.body?.operationCenterId
    );
    res.json(result);
  }),
};

module.exports = staffController;
