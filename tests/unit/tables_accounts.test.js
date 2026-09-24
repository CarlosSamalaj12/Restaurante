// tests/unit/tables_accounts.test.js
// Pruebas unitarias para los servicios desacoplados de Mesas y Cuentas

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const tablesService = require('../../src/modules/tables/tables.service');
const accountsService = require('../../src/modules/accounts/accounts.service');
const { BadRequestError } = require('../../src/common/errors');

test('tablesService validation tests', async (t) => {
  await t.test('createTable throws BadRequestError if code or centerId missing', async () => {
    await assert.rejects(
      async () => tablesService.createTable({ code: '' }),
      BadRequestError
    );
    await assert.rejects(
      async () => tablesService.createTable({ code: 'M1' }),
      BadRequestError
    );
  });

  await t.test('updateTable throws BadRequestError if missing tableId or code or centerId', async () => {
    await assert.rejects(
      async () => tablesService.updateTable(0, { code: 'M1', centerId: 1 }),
      BadRequestError
    );
    await assert.rejects(
      async () => tablesService.updateTable(1, { code: '', centerId: 1 }),
      BadRequestError
    );
  });

  await t.test('deleteTable throws BadRequestError if tableId invalid', async () => {
    await assert.rejects(
      async () => tablesService.deleteTable(0),
      BadRequestError
    );
  });

  await t.test('createArea throws BadRequestError if name missing', async () => {
    await assert.rejects(
      async () => tablesService.createArea({ name: '' }),
      BadRequestError
    );
  });

  await t.test('updateArea throws BadRequestError if areaId or name missing', async () => {
    await assert.rejects(
      async () => tablesService.updateArea(0, { name: 'Terraza' }),
      BadRequestError
    );
    await assert.rejects(
      async () => tablesService.updateArea(1, { name: '' }),
      BadRequestError
    );
  });
});

test('accountsService validation tests', async (t) => {
  await t.test('createAccount throws BadRequestError if tableId or waiterId missing', async () => {
    await assert.rejects(
      async () => accountsService.createAccount({ tableId: 0, waiterId: 1 }),
      BadRequestError
    );
    await assert.rejects(
      async () => accountsService.createAccount({ tableId: 1, waiterId: 0 }),
      BadRequestError
    );
  });

  await t.test('deleteAccount throws BadRequestError if accountId invalid', async () => {
    await assert.rejects(
      async () => accountsService.deleteAccount(0),
      BadRequestError
    );
  });

  await t.test('transferSeat throws BadRequestError if parameters missing', async () => {
    await assert.rejects(
      async () => accountsService.transferSeat({ accountId: 1, seatNo: 0, toAccountId: 2 }),
      BadRequestError
    );
    await assert.rejects(
      async () => accountsService.transferSeat({ accountId: 1, seatNo: 1, toAccountId: 0 }),
      BadRequestError
    );
  });

  await t.test('moveItem throws BadRequestError if parameters missing', async () => {
    await assert.rejects(
      async () => accountsService.moveItem({ fromAccountId: 0, itemId: 1, toAccountId: 2 }),
      BadRequestError
    );
    await assert.rejects(
      async () => accountsService.moveItem({ fromAccountId: 1, itemId: 0, toAccountId: 2 }),
      BadRequestError
    );
  });

  await t.test('splitEqual throws BadRequestError if targetAccountIds empty or < 2', async () => {
    await assert.rejects(
      async () => accountsService.splitEqual({ accountId: 1, targetAccountIds: [] }),
      BadRequestError
    );
    await assert.rejects(
      async () => accountsService.splitEqual({ accountId: 1, targetAccountIds: [1] }),
      BadRequestError
    );
  });

  await t.test('splitCustom throws BadRequestError if splits array < 2', async () => {
    await assert.rejects(
      async () => accountsService.splitCustom({ accountId: 1, splits: [] }),
      BadRequestError
    );
    await assert.rejects(
      async () => accountsService.splitCustom({ accountId: 1, splits: [{ itemIds: [1] }] }),
      BadRequestError
    );
  });

  await t.test('splitShared throws BadRequestError if peopleCount < 2', async () => {
    await assert.rejects(
      async () => accountsService.splitShared({ accountId: 1, peopleCount: 1 }),
      BadRequestError
    );
  });

  await t.test('transferAccount throws BadRequestError if transferring to same account', async () => {
    await assert.rejects(
      async () => accountsService.transferAccount({ sourceAccountId: 5, targetAccountId: 5 }),
      BadRequestError
    );
  });

  await t.test('joinAccounts throws BadRequestError if joining to same account', async () => {
    await assert.rejects(
      async () => accountsService.joinAccounts({ targetAccountId: 8, sourceAccountId: 8 }),
      BadRequestError
    );
  });
});
