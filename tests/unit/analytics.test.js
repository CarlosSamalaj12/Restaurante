// tests/unit/analytics.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const analyticsService = require("../../src/modules/analytics/analytics.service");
const { BadRequestError } = require("../../src/common/errors");

test("analyticsService validation tests", async (t) => {
  await t.test("getDashboardData throws BadRequestError on invalid startDate format", async () => {
    await assert.rejects(
      async () => {
        await analyticsService.getDashboardData({ startDate: "invalid-date" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de startDate inválido/);
        return true;
      }
    );
  });

  await t.test("getDashboardData throws BadRequestError on invalid endDate format", async () => {
    await assert.rejects(
      async () => {
        await analyticsService.getDashboardData({ endDate: "32/13/2026" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /Formato de endDate inválido/);
        return true;
      }
    );
  });
});
