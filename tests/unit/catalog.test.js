// tests/unit/catalog.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const catalogService = require("../../src/modules/catalog/catalog.service");
const { BadRequestError } = require("../../src/common/errors");

test("catalogService unit & validation tests", async (t) => {
  await t.test("getModifierTemplates returns valid structure", () => {
    const templates = catalogService.getModifierTemplates();
    assert(templates.garnish);
    assert.equal(templates.garnish.defaultMinSelect, 2);
    assert.equal(templates.preparation.defaultDisplayMethod, "radio");
  });

  await t.test("createCategory throws BadRequestError if name missing", async () => {
    await assert.rejects(
      async () => {
        await catalogService.createCategory({});
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /name es requerido/);
        return true;
      }
    );
  });

  await t.test("updateCategory throws BadRequestError if categoryId or name missing", async () => {
    await assert.rejects(
      async () => {
        await catalogService.updateCategory(0, { name: "Test" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        return true;
      }
    );
  });

  await t.test("createProduct throws BadRequestError if categoryId or name missing", async () => {
    await assert.rejects(
      async () => {
        await catalogService.createProduct({ categoryId: 1 });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /categoryId y name son requeridos/);
        return true;
      }
    );
  });

  await t.test("updateProduct throws BadRequestError if productId missing", async () => {
    await assert.rejects(
      async () => {
        await catalogService.updateProduct(0, { categoryId: 1, name: "Burger" });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        return true;
      }
    );
  });

  await t.test("updateModifierGroup throws BadRequestError if maxSelect < minSelect", async () => {
    await assert.rejects(
      async () => {
        await catalogService.updateModifierGroup(1, { name: "Sauces", minSelect: 3, maxSelect: 1 });
      },
      (err) => {
        assert(err instanceof BadRequestError);
        assert.match(err.message, /maxSelect no puede ser menor/);
        return true;
      }
    );
  });
});
