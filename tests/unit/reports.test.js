// tests/unit/reports.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const reportsService = require("../../src/modules/reports/reports.service");
const { BadRequestError } = require("../../src/common/errors");

test("reportsService validation tests", async (t) => {
  await t.test("getWaiterTipsReport throws BadRequestError if startDate or endDate is missing", async () => {
    await assert.rejects(
      async () => {
        await reportsService.getWaiterTipsReport({});
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /startDate y endDate son requeridos/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await reportsService.getWaiterTipsReport({ startDate: "2026-01-01" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        return true;
      }
    );
  });

  await t.test("getAccountTraceReport throws BadRequestError if accountId invalid", async () => {
    await assert.rejects(
      async () => {
        await reportsService.getAccountTraceReport(null);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /accountId inválido/);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await reportsService.getAccountTraceReport(-5);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        return true;
      }
    );
  });
});
