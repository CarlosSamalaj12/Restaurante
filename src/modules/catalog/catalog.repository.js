// src/modules/catalog/catalog.repository.js
// Consultas SQL puras para productos, categorías y modificadores

const { query } = require("../../common/db");

const catalogRepository = {
  async getProducts({ categoryId = 0, centerId = 0 }) {
    let centerFilter = "";
    const centerParams = [];
    if (centerId > 0) {
      centerFilter = `
        AND EXISTS (
          SELECT 1 FROM product_production_centers ppc
          INNER JOIN production_centers prc ON prc.id = ppc.center_id
          WHERE ppc.product_id = p.id
            AND (prc.operation_center_id = ? OR prc.operation_center_id IS NULL)
        )`;
      centerParams.push(centerId);
    }

    const [products] = await query(
      `SELECT p.id, p.name, p.base_price, p.category_id
       FROM products p
       WHERE p.is_active = 1 AND (? = 0 OR p.category_id = ?)
       ${centerFilter}
       ORDER BY p.name`,
      [categoryId || 0, categoryId || 0, ...centerParams]
    );
    return products;
  },

  async getModifierGroupsByProductIds(productIds) {
    if (!productIds || !productIds.length) return [];
    const placeholders = productIds.map(() => "?").join(",");
    const [groups] = await query(
      `SELECT pmg.product_id, g.id AS group_id, g.name, g.min_select, g.max_select, g.sort_order
       FROM product_modifier_groups pmg
       INNER JOIN modifier_groups g ON g.id = pmg.group_id
       WHERE pmg.product_id IN (${placeholders})
         AND g.is_active = 1
       ORDER BY pmg.product_id, g.sort_order, g.name`,
      productIds
    );
    return groups;
  },

  async getModifierOptionsByGroupIds(groupIds) {
    if (!groupIds || !groupIds.length) return [];
    const placeholders = groupIds.map(() => "?").join(",");
    const [options] = await query(
      `SELECT id, group_id, name, price_delta
       FROM modifier_options
       WHERE group_id IN (${placeholders})
         AND is_active = 1
       ORDER BY sort_order, name`,
      groupIds
    );
    return options;
  },

  async getCatalogCategories({ centerId = 0 }) {
    let centerFilter = "";
    const centerParams = [];
    if (centerId > 0) {
      centerFilter = `
        AND EXISTS (
          SELECT 1 FROM products p
          INNER JOIN product_production_centers ppc ON ppc.product_id = p.id
          INNER JOIN production_centers prc ON prc.id = ppc.center_id
          WHERE p.category_id = product_categories.id 
            AND p.is_active = 1 
            AND (prc.operation_center_id = ? OR prc.operation_center_id IS NULL)
        )`;
      centerParams.push(centerId);
    }
    const [rows] = await query(
      `SELECT id, name, color
       FROM product_categories
       WHERE is_active = 1
       ${centerFilter}
       ORDER BY sort_order, name`,
      centerParams
    );
    return rows;
  },

  // Category management
  async createCategory({ name, isActive = 1, sortOrder = 0, color = "#6366f1", centerId = null }) {
    const [result] = await query(
      `INSERT INTO product_categories (name, is_active, sort_order, color, operation_center_id)
       VALUES (?, ?, ?, ?, ?)`,
      [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, String(color || "#6366f1").trim(), centerId ? Number(centerId) : null]
    );
    return result.insertId;
  },

  async updateCategory(categoryId, { name, isActive = 1, sortOrder = 0, color = "#6366f1", centerId = null }) {
    await query(
      `UPDATE product_categories
       SET name = ?, is_active = ?, sort_order = ?, color = ?, operation_center_id = ?
       WHERE id = ?`,
      [String(name).trim(), Number(isActive) ? 1 : 0, Number(sortOrder) || 0, String(color || "#6366f1").trim(), centerId ? Number(centerId) : null, categoryId]
    );
  },

  async reorderCategories(orderList, conn = null) {
    const runner = conn || query;
    for (const item of orderList) {
      if (!item.id || typeof item.sortOrder !== "number") continue;
      await runner(
        "UPDATE product_categories SET sort_order = ? WHERE id = ?",
        [item.sortOrder, item.id]
      );
    }
  },

  async countProductsInCategory(categoryId) {
    const [rows] = await query(`SELECT COUNT(*) AS cnt FROM products WHERE category_id = ?`, [categoryId]);
    return Number(rows?.[0]?.cnt || 0);
  },

  async deleteCategory(categoryId) {
    await query(`DELETE FROM product_categories WHERE id = ?`, [categoryId]);
  },

  // Product management
  async createProduct({ categoryId, name, basePrice = 0, allowDiscount = 1, trackInventory = 0 }, conn = null) {
    const runner = conn || query;
    const [result] = await runner(
      `INSERT INTO products (category_id, name, base_price, allow_discount, is_active, track_inventory)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [Number(categoryId), String(name).trim(), Number(basePrice) || 0, Number(allowDiscount) ? 1 : 0, Number(trackInventory) ? 1 : 0]
    );
    return result.insertId;
  },

  async updateProduct(productId, { categoryId, name, basePrice = 0, allowDiscount = 1, isActive = 1, trackInventory = 0 }) {
    await query(
      `UPDATE products
       SET category_id = ?, name = ?, base_price = ?, allow_discount = ?, is_active = ?, track_inventory = ?
       WHERE id = ?`,
      [Number(categoryId), String(name).trim(), Number(basePrice) || 0, Number(allowDiscount) ? 1 : 0, Number(isActive) ? 1 : 0, Number(trackInventory) ? 1 : 0, productId]
    );
  },

  async hasSalesForProduct(productId) {
    const [rows] = await query(`SELECT id FROM order_items WHERE product_id = ? LIMIT 1`, [productId]);
    return rows.length > 0;
  },

  async deleteProduct(productId, conn = null) {
    const runner = conn || query;
    await runner(`DELETE FROM product_production_centers WHERE product_id = ?`, [productId]);
    await runner(`DELETE FROM product_modifier_groups WHERE product_id = ?`, [productId]);
    await runner(`DELETE FROM products WHERE id = ?`, [productId]);
  },

  async setProductProductionCenters(productId, centerIds, conn = null) {
    const runner = conn || query;
    await runner(`DELETE FROM product_production_centers WHERE product_id = ?`, [productId]);
    for (const centerId of centerIds) {
      await runner(
        `INSERT INTO product_production_centers (product_id, center_id) VALUES (?, ?)`,
        [productId, Number(centerId)]
      );
    }
  },

  // Modifiers and groups
  async createModifierGroup({ name, groupType, minSelect, maxSelect, isMandatory, displayMethod, sortOrder, isActive }, conn = null) {
    const runner = conn || query;
    const [result] = await runner(
      `INSERT INTO modifier_groups (name, group_type, min_select, max_select, is_mandatory, display_method, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        groupType,
        minSelect,
        maxSelect,
        isMandatory ? 1 : 0,
        displayMethod,
        Number(sortOrder) || 0,
        Number(isActive) ? 1 : 0,
      ]
    );
    return result.insertId;
  },

  async updateModifierGroup(groupId, { name, groupType, minSelect, maxSelect, isMandatory, displayMethod, sortOrder, isActive }) {
    await query(
      `UPDATE modifier_groups
       SET name = ?, group_type = ?, min_select = ?, max_select = ?, is_mandatory = ?, display_method = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [
        String(name).trim(),
        groupType,
        minSelect,
        maxSelect,
        isMandatory ? 1 : 0,
        displayMethod,
        Number(sortOrder) || 0,
        Number(isActive) ? 1 : 0,
        groupId,
      ]
    );
  },

  async getProductsAssignedToModifierGroup(groupId) {
    const [rows] = await query(
      `SELECT p.id, p.name FROM products p
       JOIN product_modifier_groups pmg ON pmg.product_id = p.id
       WHERE pmg.group_id = ?`,
      [groupId]
    );
    return rows;
  },

  async deleteModifierGroup(groupId, conn = null) {
    const runner = conn || query;
    await runner(`DELETE FROM modifier_options WHERE group_id = ?`, [groupId]);
    await runner(`DELETE FROM modifier_groups WHERE id = ?`, [groupId]);
  },

  async createModifierOption({ groupId, name, priceDelta = 0, sortOrder = 0, isActive = 1 }, conn = null) {
    const runner = conn || query;
    const [result] = await runner(
      `INSERT INTO modifier_options (group_id, name, price_delta, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, String(name).trim(), Number(priceDelta) || 0, Number(sortOrder) || 0, Number(isActive) ? 1 : 0]
    );
    return result.insertId;
  },

  async updateModifierOption(optionId, { name, priceDelta = 0, sortOrder = 0, isActive = 1 }) {
    await query(
      `UPDATE modifier_options
       SET name = ?, price_delta = ?, sort_order = ?, is_active = ?
       WHERE id = ?`,
      [String(name).trim(), Number(priceDelta) || 0, Number(sortOrder) || 0, Number(isActive) ? 1 : 0, optionId]
    );
  },

  async deleteModifierOption(optionId) {
    await query(`DELETE FROM modifier_options WHERE id = ?`, [optionId]);
  },

  async addProductStep({ productId, groupId, sortOrder = 0 }, conn = null) {
    const runner = conn || query;
    await runner(
      `INSERT INTO product_modifier_groups (product_id, group_id, sort_order)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)`,
      [Number(productId), Number(groupId), Number(sortOrder) || 0]
    );
  },

  async deleteProductStep(productId, groupId) {
    await query(`DELETE FROM product_modifier_groups WHERE product_id = ? AND group_id = ?`, [productId, groupId]);
  },

  async deleteAllProductSteps(productId) {
    await query(`DELETE FROM product_modifier_groups WHERE product_id = ?`, [productId]);
  },
};

module.exports = catalogRepository;
