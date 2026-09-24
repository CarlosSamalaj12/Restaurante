// src/modules/inventory/inventory.repository.js
// Consultas SQL directas para insumos, movimientos de stock y recetas de productos

const { query, withTransaction } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const inventoryRepository = {
  /**
   * Obtiene todos los insumos activos.
   */
  async findAllItems() {
    const [rows] = await query(
      `SELECT id, name, unit, current_stock, min_stock, cost_price, is_active
       FROM inventory_items 
       WHERE is_active = 1 
       ORDER BY name`
    );
    return rows;
  },

  /**
   * Inserta un nuevo insumo en el inventario.
   */
  async insertItem({ name, unit = "pz", costPrice = 0, minStock = 0 }) {
    const [result] = await query(
      `INSERT INTO inventory_items (name, unit, cost_price, min_stock) 
       VALUES (?, ?, ?, ?)`,
      [String(name).trim(), String(unit), Number(costPrice) || 0, Number(minStock) || 0]
    );
    return result.insertId;
  },

  /**
   * Actualiza los datos de un insumo existente.
   */
  async updateItem(id, { name, unit, costPrice, minStock }) {
    await query(
      `UPDATE inventory_items 
       SET name = ?, unit = ?, cost_price = ?, min_stock = ? 
       WHERE id = ?`,
      [String(name).trim(), String(unit), Number(costPrice) || 0, Number(minStock) || 0, Number(id)]
    );
  },

  /**
   * Desactiva (soft-delete) un insumo de inventario.
   */
  async softDeleteItem(id) {
    await query(`UPDATE inventory_items SET is_active = 0 WHERE id = ?`, [Number(id)]);
  },

  /**
   * Obtiene los movimientos recientes de un insumo.
   */
  async findMovementsByItemId(itemId, limit = 200) {
    const [rows] = await query(
      `SELECT id, type, quantity, reference_type, reference_id, note, created_by, created_at
       FROM stock_movements 
       WHERE inventory_item_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [Number(itemId), Number(limit) || 200]
    );
    return rows;
  },

  /**
   * Registra un movimiento y actualiza el stock actual de forma transaccional.
   */
  async recordMovement({ inventoryItemId, type, quantity, note = "", createdAt = nowSql() }) {
    return withTransaction(async (conn) => {
      await conn.query(
        `INSERT INTO stock_movements (inventory_item_id, type, quantity, note, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [Number(inventoryItemId), String(type), Number(quantity), String(note), createdAt]
      );

      const sign = type === "exit" ? -1 : 1;
      await conn.query(
        `UPDATE inventory_items 
         SET current_stock = current_stock + (? * ?) 
         WHERE id = ?`,
        [sign, Number(quantity), Number(inventoryItemId)]
      );
    });
  },

  /**
   * Obtiene los insumos asociados a la receta de un producto.
   */
  async findRecipeByProductId(productId) {
    const [rows] = await query(
      `SELECT pr.id, pr.inventory_item_id, pr.quantity, ii.name AS item_name, ii.unit
       FROM product_recipes pr
       INNER JOIN inventory_items ii ON ii.id = pr.inventory_item_id
       WHERE pr.product_id = ?`,
      [Number(productId)]
    );
    return rows;
  },

  /**
   * Reemplaza de forma atómica la receta de un producto.
   */
  async replaceRecipeIngredients(productId, ingredients = []) {
    return withTransaction(async (conn) => {
      await conn.query(`DELETE FROM product_recipes WHERE product_id = ?`, [Number(productId)]);
      if (Array.isArray(ingredients) && ingredients.length > 0) {
        for (const ing of ingredients) {
          await conn.query(
            `INSERT INTO product_recipes (product_id, inventory_item_id, quantity) 
             VALUES (?, ?, ?)`,
            [Number(productId), Number(ing.inventoryItemId), Number(ing.quantity)]
          );
        }
      }
    });
  },
};

module.exports = inventoryRepository;
