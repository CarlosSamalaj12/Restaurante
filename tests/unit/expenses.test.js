// tests/unit/expenses.test.js
// Pruebas unitarias para el servicio de Gastos, Proveedores y Balance Financiero

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const expensesService = require('../../src/modules/expenses/expenses.service');
const { BadRequestError } = require('../../src/common/errors');

test('expensesService validation tests', async (t) => {
  await t.test('createExpense throws BadRequestError if expenseDate missing', async () => {
    await assert.rejects(
      async () => {
        await expensesService.createExpense({
          categoryId: 1,
          description: 'Gasto de prueba',
          amount: 100,
        });
      },
      (err) => err instanceof BadRequestError && err.message.includes('fecha del gasto')
    );
  });

  await t.test('createExpense throws BadRequestError if categoryId missing', async () => {
    await assert.rejects(
      async () => {
        await expensesService.createExpense({
          expenseDate: '2026-10-12',
          description: 'Gasto de prueba',
          amount: 100,
        });
      },
      (err) => err instanceof BadRequestError && err.message.includes('categoría')
    );
  });

  await t.test('createExpense throws BadRequestError if description missing or empty', async () => {
    await assert.rejects(
      async () => {
        await expensesService.createExpense({
          expenseDate: '2026-10-12',
          categoryId: 1,
          description: '   ',
          amount: 100,
        });
      },
      (err) => err instanceof BadRequestError && err.message.includes('descripción')
    );
  });

  await t.test('createExpense throws BadRequestError if amount <= 0 or invalid', async () => {
    await assert.rejects(
      async () => {
        await expensesService.createExpense({
          expenseDate: '2026-10-12',
          categoryId: 1,
          description: 'Gasto de prueba',
          amount: -5,
        });
      },
      (err) => err instanceof BadRequestError && err.message.includes('monto')
    );
  });

  await t.test('createCategory throws BadRequestError if name missing', async () => {
    await assert.rejects(
      async () => {
        await expensesService.createCategory({ name: ' ' });
      },
      (err) => err instanceof BadRequestError && err.message.includes('nombre')
    );
  });

  await t.test('createSupplier throws BadRequestError if name missing', async () => {
    await assert.rejects(
      async () => {
        await expensesService.createSupplier({ name: '' });
      },
      (err) => err instanceof BadRequestError && err.message.includes('nombre del proveedor')
    );
  });

  await t.test('registerSupplierPayment throws BadRequestError if amount <= 0', async () => {
    await assert.rejects(
      async () => {
        await expensesService.registerSupplierPayment(1, { amount: -50 });
      },
      (err) => err instanceof BadRequestError && err.message.includes('monto')
    );
  });

  await t.test('uploadVoucher throws BadRequestError if base64 missing', async () => {
    await assert.rejects(
      async () => {
        await expensesService.uploadVoucher({});
      },
      (err) => err instanceof BadRequestError && err.message.includes('base64')
    );
  });
});
