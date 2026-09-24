// src/modules/accounts/accounts.repository.js
// Capa de acceso a datos para cuentas (accounts), eventos, precuentas e ítems

const { query } = require("../../common/db");
const { nowSql, money } = require("../../common/utils");

const accountsRepository = {
  async findById(accountId, conn = null) {
    const [rows] = await query(
      `SELECT a.id, a.table_id, a.operation_center_id, a.waiter_id, a.shift_id,
              a.customer_id, a.check_number, a.guest_count, a.status, a.tip_percent_override,
              a.opened_at, a.closed_at, a.merged_into_account_id,
              u.full_name AS waiter_name
       FROM accounts a
       LEFT JOIN staff_users u ON u.id = a.waiter_id
       WHERE a.id = ?
       LIMIT 1`,
      [Number(accountId)],
      conn
    );
    return rows[0] || null;
  },

  async findDetailsForReceipt(accountId, conn = null) {
    const [rows] = await query(
      `SELECT a.*, t.code AS table_code, u.full_name AS waiter_name,
              oc.name AS center_name
       FROM accounts a
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
       WHERE a.id = ?
       LIMIT 1`,
      [Number(accountId)],
      conn
    );
    return rows[0] || null;
  },

  async findByCheckNumber(checkNumber, conn = null) {
    const [rows] = await query(
      `SELECT id, check_number, status
       FROM accounts
       WHERE check_number = ?
       ORDER BY id DESC
       LIMIT 1`,
      [String(checkNumber).trim()],
      conn
    );
    return rows[0] || null;
  },

  async findOpenAccountsByTableId(tableId, conn = null) {
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.guest_count, a.waiter_id, u.full_name AS waiter_name, a.opened_at
       FROM accounts a
       INNER JOIN staff_users u ON u.id = a.waiter_id
       WHERE a.table_id = ? AND a.status = 'open'
       ORDER BY a.opened_at`,
      [Number(tableId)],
      conn
    );
    return rows;
  },

  async findOpenAccounts(centerId = 0, conn = null) {
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.status, a.table_id, a.waiter_id, a.guest_count, a.opened_at,
              t.code AS table_code, t.operation_center_id,
              u.full_name AS waiter_name,
              oc.name AS center_name,
              (SELECT COALESCE(SUM(oi.line_total), 0) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS total,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS item_count,
              (SELECT MAX(oi.created_at) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS last_activity
       FROM accounts a
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN staff_users u ON u.id = a.waiter_id
       LEFT JOIN operation_centers oc ON oc.id = t.operation_center_id
       WHERE a.status = 'open' AND (? = 0 OR t.operation_center_id = ?)
       ORDER BY a.opened_at DESC`,
      [Number(centerId) || 0, Number(centerId) || 0],
      conn
    );
    return rows;
  },

  async findTopItemsByAccountIds(accountIds, limitPerAccount = 5, conn = null) {
    if (!accountIds.length) return {};
    const placeholders = accountIds.map(() => "?").join(",");
    const [items] = await query(
      `SELECT oi.account_id, p.name AS product_name, oi.qty, oi.line_total
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id IN (${placeholders}) AND oi.status = 'active'
       ORDER BY oi.created_at ASC`,
      accountIds,
      conn
    );
    const map = {};
    for (const item of items) {
      if (!map[item.account_id]) map[item.account_id] = [];
      if (map[item.account_id].length < limitPerAccount) {
        map[item.account_id].push(item);
      }
    }
    return map;
  },

  async searchPaidAccounts({ centerId, q, startDate, endDate }, conn = null) {
    const conditions = ["t.operation_center_id = ?", "a.status = 'paid'"];
    const params = [Number(centerId)];

    if (q && String(q).trim()) {
      conditions.push("a.check_number LIKE ?");
      params.push(`%${String(q).trim()}%`);
    }
    if (startDate) {
      conditions.push("a.closed_at >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("a.closed_at <= ?");
      params.push(`${endDate} 23:59:59`);
    }

    const [rows] = await query(
      `SELECT a.id, a.check_number, a.status, a.guest_count, a.closed_at, a.table_id, t.code AS table_code,
              u.full_name AS waiter_name, oc.name AS center_name,
              (SELECT COALESCE(SUM(oi.line_total), 0) FROM order_items oi WHERE oi.account_id = a.id AND oi.status = 'active') AS total
       FROM accounts a
       INNER JOIN staff_users u ON u.id = a.waiter_id
       INNER JOIN restaurant_tables t ON t.id = a.table_id
       INNER JOIN operation_centers oc ON oc.id = t.operation_center_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY a.closed_at DESC
       LIMIT 20`,
      params,
      conn
    );
    return rows;
  },

  async findOrderItems(accountId, conn = null) {
    const [rows] = await query(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.seat_no, oi.qty, oi.unit_price, oi.line_total, oi.notes, oi.sent_at
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.account_id = ? AND oi.status = 'active'
       ORDER BY oi.id DESC`,
      [Number(accountId)],
      conn
    );
    return rows;
  },

  async findOrderItemModifiers(itemIds, conn = null) {
    if (!itemIds.length) return {};
    const placeholders = itemIds.map(() => "?").join(",");
    const [mods] = await query(
      `SELECT oim.item_id, mo.name, oim.price_delta
       FROM order_item_modifiers oim
       INNER JOIN modifier_options mo ON mo.id = oim.option_id
       WHERE oim.item_id IN (${placeholders})`,
      itemIds,
      conn
    );
    return mods.reduce((acc, m) => {
      acc[m.item_id] = acc[m.item_id] || [];
      acc[m.item_id].push({ name: m.name, priceDelta: Number(m.price_delta) });
      return acc;
    }, {});
  },

  async findPayments(accountId, conn = null) {
    const [rows] = await query(
      `SELECT pm.label AS method_label, p.method, p.amount, p.reference_no, p.created_at
       FROM account_payments p
       LEFT JOIN payment_methods pm ON pm.code = p.method
       WHERE p.account_id = ?
       ORDER BY p.created_at`,
      [Number(accountId)],
      conn
    );
    return rows;
  },

  async getSubtotal(accountId, conn = null) {
    const [rows] = await query(
      `SELECT COALESCE(SUM(line_total), 0) AS subtotal
       FROM order_items
       WHERE account_id = ? AND status = 'active'`,
      [Number(accountId)],
      conn
    );
    return money(rows[0]?.subtotal || 0);
  },

  async getDiscounts(accountId, conn = null) {
    const [rows] = await query(
      `SELECT type, value FROM account_discounts WHERE account_id = ?`,
      [Number(accountId)],
      conn
    );
    return rows;
  },

  async getTipOverride(accountId, conn = null) {
    const [rows] = await query(
      `SELECT tip_percent_override FROM accounts WHERE id = ? LIMIT 1`,
      [Number(accountId)],
      conn
    );
    if (!rows.length) return { hasOverride: false, tipPercent: null };
    const raw = rows[0].tip_percent_override;
    const hasOverride = raw !== null && raw !== undefined;
    return { hasOverride, tipPercent: hasOverride ? Number(raw) : null };
  },

  async getTotalPaid(accountId, conn = null) {
    const [rows] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM account_payments WHERE account_id = ?`,
      [Number(accountId)],
      conn
    );
    return money(rows[0]?.paid || 0);
  },

  async findOpenShift(centerId, conn = null) {
    const [rows] = await query(
      `SELECT id FROM shifts
       WHERE status = 'open' AND operation_center_id = ?
       ORDER BY id DESC LIMIT 1`,
      [Number(centerId)],
      conn
    );
    return rows[0] || null;
  },

  async createAccountRecord(data, conn = null) {
    const { tableId, centerId, waiterId, shiftId, customerId, guestCount, tempCheckNumber } = data;
    const [result] = await query(
      `INSERT INTO accounts (table_id, operation_center_id, waiter_id, shift_id, customer_id, status, guest_count, check_number, opened_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
      [
        Number(tableId),
        Number(centerId),
        Number(waiterId),
        shiftId ? Number(shiftId) : null,
        customerId ? Number(customerId) : null,
        Number(guestCount) || 1,
        tempCheckNumber,
        nowSql(),
      ],
      conn
    );
    return result.insertId;
  },

  async updateCheckNumber(accountId, checkNumber, conn = null) {
    await query(
      `UPDATE accounts SET check_number = ? WHERE id = ?`,
      [checkNumber, Number(accountId)],
      conn
    );
  },

  async setTipOverride(accountId, tipPercentOrNull, conn = null) {
    await query(
      `UPDATE accounts SET tip_percent_override = ? WHERE id = ?`,
      [tipPercentOrNull === null ? null : Number(tipPercentOrNull), Number(accountId)],
      conn
    );
  },

  async addEvent(accountId, eventType, payload = {}, createdBy = null, conn = null) {
    await query(
      `INSERT INTO account_events (account_id, event_type, payload, created_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(accountId), eventType, JSON.stringify(payload || {}), createdBy || null, nowSql()],
      conn
    );
  },

  async countActivity(accountId, conn = null) {
    const [[items]] = await query(`SELECT COUNT(*) AS c FROM order_items WHERE account_id = ? AND status = 'active'`, [Number(accountId)], conn);
    const [[payments]] = await query(`SELECT COUNT(*) AS c FROM account_payments WHERE account_id = ?`, [Number(accountId)], conn);
    const [[discounts]] = await query(`SELECT COUNT(*) AS c FROM account_discounts WHERE account_id = ?`, [Number(accountId)], conn);
    const [[folios]] = await query(`SELECT COUNT(*) AS c FROM folio_charges WHERE account_id = ?`, [Number(accountId)], conn);

    return (
      Number(items?.c || 0) +
      Number(payments?.c || 0) +
      Number(discounts?.c || 0) +
      Number(folios?.c || 0)
    );
  },

  async deleteAccountCascade(accountId, conn = null) {
    await query(`DELETE FROM account_events WHERE account_id = ?`, [Number(accountId)], conn);
    await query(`DELETE FROM accounts WHERE id = ?`, [Number(accountId)], conn);
  },

  async transferSeat(fromAccountId, toAccountId, seatNo, conn = null) {
    const [result] = await query(
      `UPDATE order_items SET account_id = ? WHERE account_id = ? AND seat_no = ? AND status = 'active'`,
      [Number(toAccountId), Number(fromAccountId), Number(seatNo)],
      conn
    );
    return result.affectedRows;
  },

  async findItemById(itemId, accountId, conn = null) {
    const [rows] = await query(
      `SELECT id, account_id, product_id, seat_no, qty, unit_price, line_total, notes, sent_at, created_at
       FROM order_items
       WHERE id = ? AND account_id = ? AND status = 'active'
       LIMIT 1`,
      [Number(itemId), Number(accountId)],
      conn
    );
    return rows[0] || null;
  },

  async findModifiersForItem(itemId, conn = null) {
    const [rows] = await query(
      `SELECT option_id, price_delta FROM order_item_modifiers WHERE item_id = ?`,
      [Number(itemId)],
      conn
    );
    return rows;
  },

  async reassignItemAccount(itemId, toAccountId, conn = null) {
    await query(`UPDATE order_items SET account_id = ? WHERE id = ?`, [Number(toAccountId), Number(itemId)], conn);
  },

  async updateItemQtyAndTotal(itemId, qty, lineTotal, conn = null) {
    await query(
      `UPDATE order_items SET qty = ?, line_total = ? WHERE id = ?`,
      [qty, lineTotal, Number(itemId)],
      conn
    );
  },

  async insertOrderItem(itemData, conn = null) {
    const { accountId, productId, seatNo, qty, unitPrice, lineTotal, notes, sentAt } = itemData;
    const [result] = await query(
      `INSERT INTO order_items (account_id, product_id, seat_no, qty, unit_price, line_total, notes, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(accountId),
        Number(productId),
        Number(seatNo || 1),
        qty,
        unitPrice,
        lineTotal,
        notes || "",
        sentAt || null,
        nowSql(),
      ],
      conn
    );
    return result.insertId;
  },

  async insertOrderItemModifiers(itemId, modifiers, conn = null) {
    for (const mod of modifiers) {
      await query(
        `INSERT INTO order_item_modifiers (item_id, option_id, price_delta)
         VALUES (?, ?, ?)`,
        [Number(itemId), Number(mod.option_id), Number(mod.price_delta || 0)],
        conn
      );
    }
  },

  async transferAllItems(sourceAccountId, targetAccountId, conn = null) {
    const [items] = await query(
      `SELECT id FROM order_items WHERE account_id = ? AND status = 'active'`,
      [Number(sourceAccountId)],
      conn
    );
    for (const item of items) {
      await query(
        `UPDATE order_items SET account_id = ? WHERE id = ? AND status = 'active'`,
        [Number(targetAccountId), Number(item.id)],
        conn
      );
    }
    return items.length;
  },

  async closeAccountWithStatus(accountId, status, mergedIntoAccountId = null, conn = null) {
    if (mergedIntoAccountId) {
      await query(
        `UPDATE accounts SET status = ?, merged_into_account_id = ? WHERE id = ?`,
        [status, Number(mergedIntoAccountId), Number(accountId)],
        conn
      );
    } else {
      await query(
        `UPDATE accounts SET status = ?, closed_at = ? WHERE id = ?`,
        [status, nowSql(), Number(accountId)],
        conn
      );
    }
  },
};

module.exports = accountsRepository;
