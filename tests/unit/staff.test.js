// tests/unit/staff.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const staffService = require("../../src/modules/settings/staff/staff.service");
const { BadRequestError } = require("../../src/common/errors");

test("staffService unit & validation tests (subdomain staff)", async (t) => {
  await t.test("updateUserModules throws BadRequestError if userId missing", async () => {
    await assert.rejects(
      async () => {
        await staffService.updateUserModules(0, ["restaurant"]);
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /userId es requerido/);
        return true;
      }
    );
  });

  await t.test("createRole throws BadRequestError if name or slug missing", async () => {
    await assert.rejects(
      async () => {
        await staffService.createRole({ name: "Admin" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /name y slug son requeridos/);
        return true;
      }
    );
  });

  await t.test("createStaffUser throws BadRequestError if fullName or pinCode missing", async () => {
    await assert.rejects(
      async () => {
        await staffService.createStaffUser({ fullName: "Carlos" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /fullName y pinCode son requeridos/);
        return true;
      }
    );
  });

  await t.test("createStaffUser throws BadRequestError if PIN is not 6 digits", async () => {
    await assert.rejects(
      async () => {
        await staffService.createStaffUser({ fullName: "Carlos", pinCode: "123" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /PIN debe tener exactamente 6 dígitos/);
        return true;
      }
    );
  });
});
