// tests/unit/shifts.test.js
// Pruebas unitarias de validación para el servicio de turnos y caja

const test = require("node:test");
const assert = require("node:assert/strict");
const shiftsService = require("../../src/modules/shifts/shifts.service");
const { BadRequestError } = require("../../src/common/errors");

test("shiftsService validation tests", async (t) => {
  await t.test("getActiveShift throws BadRequestError if centerId invalid", async () => {
    await assert.rejects(
      () => shiftsService.getActiveShift(0),
      (err) => err instanceof BadRequestError && err.message.includes("centerId")
    );
  });

  await t.test("openShift throws BadRequestError if cashierId or centerId missing", async () => {
    await assert.rejects(
      () => shiftsService.openShift({ cashierId: 0, centerId: 1 }),
      (err) => err instanceof BadRequestError && err.message.includes("cashierId y centerId")
    );
    await assert.rejects(
      () => shiftsService.openShift({ cashierId: 1, centerId: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("cashierId y centerId")
    );
  });

  await t.test("getShiftPreview throws BadRequestError if centerId missing", async () => {
    await assert.rejects(
      () => shiftsService.getShiftPreview({ centerId: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("centerId")
    );
  });

  await t.test("closeShift throws BadRequestError if centerId missing", async () => {
    await assert.rejects(
      () => shiftsService.closeShift({ centerId: 0 }),
      (err) => err instanceof BadRequestError && err.message.includes("centerId")
    );
  });

  await t.test("getClosedShifts throws BadRequestError if centerId missing", async () => {
    await assert.rejects(
      () => shiftsService.getClosedShifts(0),
      (err) => err instanceof BadRequestError && err.message.includes("centerId")
    );
  });

  await t.test("getShiftReport throws BadRequestError if shiftId missing", async () => {
    await assert.rejects(
      () => shiftsService.getShiftReport(0),
      (err) => err instanceof BadRequestError && err.message.includes("shiftId")
    );
  });
});
