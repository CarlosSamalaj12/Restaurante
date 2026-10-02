// tests/unit/sync.test.js
// Pruebas unitarias para el servicio y controlador de sincronización offline

const test = require("node:test");
const assert = require("node:assert/strict");
const syncService = require("../../src/modules/sync/sync.service");
const syncController = require("../../src/modules/sync/sync.controller");

test("syncService batch processing validation", async (t) => {
  await t.test("processBatch returns empty result for empty items array", async () => {
    const res = await syncService.processBatch({ items: [] });
    assert.equal(res.success, true);
    assert.equal(res.processedCount, 0);
    assert.deepEqual(res.results, []);
  });

  await t.test("processBatch returns empty result for non-array items", async () => {
    const res = await syncService.processBatch({ items: null });
    assert.equal(res.success, true);
    assert.equal(res.processedCount, 0);
  });
});

test("syncController health check tests", async (t) => {
  await t.test("getSyncHealth returns status ok and offlineSupport true", () => {
    let responseData = null;
    const mockRes = {
      json: (data) => {
        responseData = data;
      },
    };

    syncController.getSyncHealth({}, mockRes);
    assert.ok(responseData);
    assert.equal(responseData.status, "ok");
    assert.equal(responseData.offlineSupport, true);
    assert.equal(responseData.protocolVersion, "1.0");
  });
});
