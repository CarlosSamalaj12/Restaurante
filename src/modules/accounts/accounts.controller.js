// src/modules/accounts/accounts.controller.js
// Controlador HTTP para cuentas, transferencias, precuentas y divisiones

const accountsService = require("./accounts.service");
const asyncHandler = require("../../common/asyncHandler");

const accountsController = {
  getAccountById: asyncHandler(async (req, res) => {
    const result = await accountsService.getAccountById(req.params.accountId);
    res.json(result);
  }),

  getAccountByCheck: asyncHandler(async (req, res) => {
    const result = await accountsService.getAccountByCheck(req.params.checkNumber);
    res.json(result);
  }),

  getTableAccounts: asyncHandler(async (req, res) => {
    const result = await accountsService.getTableAccounts(req.params.tableId);
    res.json(result);
  }),

  getOpenAccounts: asyncHandler(async (req, res) => {
    const centerId = Number(req.query.centerId || "0");
    const result = await accountsService.getOpenAccounts(centerId);
    res.json(result);
  }),

  searchPaidAccounts: asyncHandler(async (req, res) => {
    const { q, centerId, startDate, endDate } = req.query;
    const result = await accountsService.searchPaidAccounts({ q, centerId, startDate, endDate });
    res.json(result);
  }),

  getAccountPrecheck: asyncHandler(async (req, res) => {
    const result = await accountsService.getAccountPrecheck(req.params.accountId);
    res.json(result);
  }),

  getAccountReceipt: asyncHandler(async (req, res) => {
    const result = await accountsService.getAccountReceipt(req.params.accountId);
    res.json(result);
  }),

  createAccount: asyncHandler(async (req, res) => {
    const tableId = Number(req.params.tableId || req.body?.tableId);
    const { waiterId, guestCount, customerId, centerId } = req.body || {};
    const result = await accountsService.createAccount({
      tableId,
      waiterId,
      guestCount,
      customerId,
      centerId,
    });
    res.status(201).json(result);
  }),

  deleteAccount: asyncHandler(async (req, res) => {
    const result = await accountsService.deleteAccount(req.params.accountId);
    res.json(result);
  }),

  removeTip: asyncHandler(async (req, res) => {
    const result = await accountsService.removeTip(req.params.accountId);
    res.json(result);
  }),

  restoreTip: asyncHandler(async (req, res) => {
    const result = await accountsService.restoreTip(req.params.accountId);
    res.json(result);
  }),

  transferSeat: asyncHandler(async (req, res) => {
    const { seatNo, toAccountId } = req.body || {};
    const result = await accountsService.transferSeat({
      accountId: req.params.accountId,
      seatNo,
      toAccountId,
    });
    res.json(result);
  }),

  moveItem: asyncHandler(async (req, res) => {
    const { itemId, toAccountId, qty } = req.body || {};
    const result = await accountsService.moveItem({
      fromAccountId: req.params.accountId,
      itemId,
      toAccountId,
      qty,
    });
    res.json(result);
  }),

  splitEqual: asyncHandler(async (req, res) => {
    const { targetAccountIds } = req.body || {};
    const result = await accountsService.splitEqual({
      accountId: req.params.accountId,
      targetAccountIds,
    });
    res.json(result);
  }),

  splitCustom: asyncHandler(async (req, res) => {
    const { splits } = req.body || {};
    const result = await accountsService.splitCustom({
      accountId: req.params.accountId,
      splits,
    });
    res.json(result);
  }),

  splitShared: asyncHandler(async (req, res) => {
    const { peopleCount } = req.body || {};
    const result = await accountsService.splitShared({
      accountId: req.params.accountId,
      peopleCount,
    });
    res.json(result);
  }),

  transferAccount: asyncHandler(async (req, res) => {
    const { targetAccountId } = req.body || {};
    const result = await accountsService.transferAccount({
      sourceAccountId: req.params.accountId,
      targetAccountId,
    });
    res.json(result);
  }),

  joinAccounts: asyncHandler(async (req, res) => {
    const { sourceAccountId } = req.body || {};
    const result = await accountsService.joinAccounts({
      targetAccountId: req.params.accountId,
      sourceAccountId,
    });
    res.json(result);
  }),
};

module.exports = accountsController;
