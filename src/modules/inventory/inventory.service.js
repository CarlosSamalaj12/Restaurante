// src/modules/inventory/inventory.service.js
// Lógica de negocio para inventario, recetas de platillos y movimientos de stock

const inventoryRepository = require("./inventory.repository");
const { BadRequestError } = require("../../common/errors");

const inventoryService = {
  async getAllItems() {
    return inventoryRepository.findAllItems();
  },

  async createItem({ name, unit = "pz", costPrice = 0, minStock = 0 }) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new BadRequestError("name es requerido");

    const id = await inventoryRepository.insertItem({
      name: cleanName,
      unit: String(unit || "pz").trim(),
      costPrice: Number(costPrice) || 0,
      minStock: Number(minStock) || 0,
    });

    return { id };
  },

  async updateItem(id, { name, unit = "pz", costPrice = 0, minStock = 0 }) {
    const parsedId = Number(id);
    if (!parsedId) throw new BadRequestError("id inválido");

    const cleanName = String(name || "").trim();
    if (!cleanName) throw new BadRequestError("name es requerido");

    await inventoryRepository.updateItem(parsedId, {
      name: cleanName,
      unit: String(unit || "pz").trim(),
      costPrice: Number(costPrice) || 0,
      minStock: Number(minStock) || 0,
    });

    return { ok: true };
  },

  async deleteItem(id) {
    const parsedId = Number(id);
    if (!parsedId) throw new BadRequestError("id inválido");

    await inventoryRepository.softDeleteItem(parsedId);
    return { ok: true };
  },

  async getMovements(itemId, limit = 200) {
    const parsedId = Number(itemId);
    if (!parsedId) throw new BadRequestError("itemId inválido");

    return inventoryRepository.findMovementsByItemId(parsedId, limit);
  },

  async recordMovement({ inventoryItemId, type, quantity, note = "" }) {
    const parsedItemId = Number(inventoryItemId);
    const parsedQty = Number(quantity);
    const cleanType = String(type || "").trim();

    if (!parsedItemId || !cleanType || !parsedQty) {
      throw new BadRequestError("inventoryItemId, type y quantity son requeridos");
    }

    if (parsedQty <= 0) {
      throw new BadRequestError("quantity debe ser mayor a 0");
    }

    await inventoryRepository.recordMovement({
      inventoryItemId: parsedItemId,
      type: cleanType,
      quantity: parsedQty,
      note,
    });

    return { ok: true };
  },

  async getProductRecipe(productId) {
    const parsedProductId = Number(productId);
    if (!parsedProductId) throw new BadRequestError("productId inválido");

    return inventoryRepository.findRecipeByProductId(parsedProductId);
  },

  async saveProductRecipe(productId, ingredients = []) {
    const parsedProductId = Number(productId);
    if (!parsedProductId) throw new BadRequestError("productId inválido");

    await inventoryRepository.replaceRecipeIngredients(parsedProductId, ingredients);
    return { ok: true };
  },
};

module.exports = inventoryService;
