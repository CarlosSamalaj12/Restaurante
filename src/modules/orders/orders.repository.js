// src/modules/orders/orders.repository.js
// Capa de acceso a datos para órdenes, modificadores y despacho a cocina

const { query } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const ordersRepository = {
  async findProductForOrder(productId, conn = null) {
    const [rows] = await query(
      `SELECT id, name, base_price, is_active FROM products WHERE id = ? AND is_active = 1`,
      [Number(productId)],
      conn
    );
    return rows[0] || null;
  },

  async findRequiredModifierGroups(productId, conn = null) {
    const [rows] = await query(
      `SELECT g.id, g.name, g.min_select, g.max_select
       FROM product_modifier_groups pmg
       INNER JOIN modifier_groups g ON g.id = pmg.group_id
       WHERE pmg.product_id = ?
         AND g.is_active = 1`,
      [Number(productId)],
      conn
    );
    return rows;
  },

  async findAllowedModifierOptions(productId, optionIds, conn = null) {
    if (!optionIds.length) return [];
    const placeholders = optionIds.map(() => "?").join(",");
    const [rows] = await query(
      `SELECT mo.id, mo.group_id, mo.name, mo.price_delta
       FROM modifier_options mo
       INNER JOIN product_modifier_groups pmg ON pmg.group_id = mo.group_id
       WHERE pmg.product_id = ?
         AND mo.is_active = 1
         AND mo.id IN (${placeholders})`,
      [Number(productId), ...optionIds],
      conn
    );
    return rows;
  },

  async insertOrderItem(itemData, conn = null) {
    const { accountId, productId, seatNo, qty, unitPrice, lineTotal, notes } = itemData;
    const [result] = await query(
      `INSERT INTO order_items (account_id, product_id, seat_no, qty, unit_price, line_total, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(accountId),
        Number(productId),
        Number(seatNo) || 1,
        Number(qty) || 1,
        unitPrice,
        lineTotal,
        notes || "",
        nowSql(),
      ],
      conn
    );
    return result.insertId;
  },

  async insertOrderItemModifiers(itemId, modifierOptionsWithDelta, conn = null) {
    for (const mod of modifierOptionsWithDelta) {
      await query(
        `INSERT INTO order_item_modifiers (item_id, option_id, price_delta) VALUES (?, ?, ?)`,
        [Number(itemId), Number(mod.optionId), Number(mod.priceDelta || 0)],
        conn
      );
    }
  },

  async findAccountSummaryForSend(accountId, conn = null) {
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.status, a.waiter_id,
              t.code AS table_code,
              u.full_name AS waiter_name,
              oc.id AS center_id, oc.name AS center_name
       FROM accounts a
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
       WHERE a.id = ?`,
      [Number(accountId)],
      conn
    );
    return rows[0] || null;
  },

  async findUnsentOrderItems(accountId, conn = null) {
    const [rows] = await query(
      `SELECT
        oi.id,
        oi.product_id,
        p.name AS product_name,
        oi.qty,
        oi.seat_no,
        oi.notes,
        oi.created_at,
        oi.line_total,
        pc.id AS center_id,
        COALESCE(pc.name, 'Restaurante') AS center_name,
        pc.printer_name
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
       LEFT JOIN production_centers pc ON pc.id = ppc.center_id
       WHERE oi.account_id = ? AND oi.status = 'active' AND oi.sent_at IS NULL
       ORDER BY center_name, oi.id`,
      [Number(accountId)],
      conn
    );
    return rows;
  },

  async findItemModifiersForSend(itemIds, conn = null) {
    if (!itemIds.length) return {};
    const placeholders = itemIds.map(() => "?").join(",");
    const [mods] = await query(
      `SELECT oim.item_id, mo.name, oim.price_delta
       FROM order_item_modifiers oim
       INNER JOIN modifier_options mo ON mo.id = oim.option_id
       WHERE oim.item_id IN (${placeholders})
       ORDER BY oim.item_id, oim.id`,
      itemIds,
      conn
    );
    return mods.reduce((acc, m) => {
      const key = Number(m.item_id);
      acc[key] = acc[key] || [];
      acc[key].push({ name: m.name, priceDelta: Number(m.price_delta || 0) });
      return acc;
    }, {});
  },

  async markItemsAsSent(accountId, conn = null) {
    await query(
      `UPDATE order_items
       SET sent_at = ?
       WHERE account_id = ? AND status = 'active' AND sent_at IS NULL`,
      [nowSql(), Number(accountId)],
      conn
    );
  },

  async findProductionCenter(centerId, conn = null) {
    const [rows] = await query(
      `SELECT id, name, printer_name, printer_ip, printer_port
       FROM production_centers WHERE id = ? LIMIT 1`,
      [Number(centerId)],
      conn
    );
    return rows[0] || null;
  },

  async updateItemSeat(itemId, newSeatNo, conn = null) {
    const [result] = await query(
      `UPDATE order_items SET seat_no = ? WHERE id = ? AND status = 'active'`,
      [Number(newSeatNo), Number(itemId)],
      conn
    );
    return result.affectedRows > 0;
  },

  async findItemForQtyUpdate(itemId, conn = null) {
    const [rows] = await query(
      `SELECT id, account_id, unit_price, sent_at
       FROM order_items
       WHERE id = ? AND status = 'active'`,
      [Number(itemId)],
      conn
    );
    return rows[0] || null;
  },

  async updateItemQty(itemId, nextQty, lineTotal, conn = null) {
    await query(
      `UPDATE order_items
       SET qty = ?, line_total = ?
       WHERE id = ? AND status = 'active'`,
      [nextQty, lineTotal, Number(itemId)],
      conn
    );
  },

  async findItemForVoid(itemId, conn = null) {
    const [rows] = await query(
      `SELECT
        oi.account_id,
        oi.sent_at,
        oi.status,
        oi.qty,
        oi.seat_no,
        oi.notes,
        p.id AS product_id,
        p.name AS product_name,
        a.check_number,
        rt.code AS table_code,
        waiter.id AS waiter_id,
        waiter.full_name AS waiter_name,
        pc.id AS center_id,
        COALESCE(pc.name, 'Restaurante') AS center_name,
        COALESCE(pc.printer_name, 'DEFAULT') AS printer_name
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN accounts a ON a.id = oi.account_id
       INNER JOIN restaurant_tables rt ON rt.id = a.table_id
       INNER JOIN staff_users waiter ON waiter.id = a.waiter_id
       LEFT JOIN product_production_centers ppc ON ppc.product_id = p.id
       LEFT JOIN production_centers pc ON pc.id = ppc.center_id
       WHERE oi.id = ?`,
      [Number(itemId)],
      conn
    );
    return rows[0] || null;
  },

  async findManagerOrAdminByPin(pin, conn = null) {
    const [rows] = await query(
      `SELECT id, full_name, role
       FROM staff_users
       WHERE pin_code = ? AND role IN ('manager', 'admin')
       LIMIT 1`,
      [String(pin).trim()],
      conn
    );
    return rows[0] || null;
  },

  async findUserById(userId, conn = null) {
    const [rows] = await query(
      `SELECT id, full_name, role FROM staff_users WHERE id = ? LIMIT 1`,
      [Number(userId)],
      conn
    );
    return rows[0] || null;
  },

  async voidOrderItem(itemId, reason, authorizedBy, conn = null) {
    await query(
      `UPDATE order_items
       SET status = 'void', void_reason = ?, void_authorized_by = ?, voided_at = ?
       WHERE id = ? AND status = 'active'`,
      [reason || "", Number(authorizedBy), nowSql(), Number(itemId)],
      conn
    );
  },
};

module.exports = ordersRepository;
