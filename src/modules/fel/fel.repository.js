// src/modules/fel/fel.repository.js
// Acceso a datos para configuración de FEL y registro de facturas emitidas

const { query } = require("../../common/db");

const felRepository = {
  async getConfig() {
    const [rows] = await query(`SELECT * FROM fel_config WHERE id = 1 LIMIT 1`);
    return rows[0] || null;
  },

  async updateConfig(fields) {
    const allowed = [
      "is_enabled",
      "provider",
      "environment",
      "issuer_nit",
      "issuer_name",
      "commercial_name",
      "establishment_code",
      "affiliation",
      "sat_phrase_type",
      "sat_phrase_code",
      "api_username",
      "api_key",
      "api_token",
      "api_alias",
      "receipt_copies",
      "kitchen_copies",
      "ticket_width",
      "print_qr",
    ];

    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.getConfig();

    values.push(1);
    await query(`UPDATE fel_config SET ${updates.join(", ")} WHERE id = ?`, values);
    return this.getConfig();
  },

  async getPaymentMethodsFelRules() {
    const [rows] = await query(`
      SELECT code, label, is_active, auto_invoice, default_recipient
      FROM payment_methods
      ORDER BY sort_order ASC
    `);
    return rows;
  },

  async updatePaymentMethodFelRule(code, autoInvoice, defaultRecipient = "CF") {
    await query(
      `UPDATE payment_methods SET auto_invoice = ?, default_recipient = ? WHERE code = ?`,
      [autoInvoice ? 1 : 0, defaultRecipient, code]
    );
  },

  async insertInvoice(inv) {
    const [result] = await query(
      `INSERT INTO fel_invoices (
         account_id, uuid, serie, dte_number, certified_at,
         recipient_nit, recipient_name, recipient_address,
         total_amount, tax_amount, net_amount,
         certifier, status, xml_url, pdf_url, qr_data
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inv.accountId,
        inv.uuid,
        inv.serie,
        inv.dteNumber,
        inv.certifiedAt,
        inv.recipientNit || "CF",
        inv.recipientName || "CONSUMIDOR FINAL",
        inv.recipientAddress || "CIUDAD",
        inv.totalAmount,
        inv.taxAmount,
        inv.netAmount,
        inv.certifier || "demo",
        inv.status || "certified",
        inv.xmlUrl || null,
        inv.pdfUrl || null,
        inv.qrData || null,
      ]
    );
    return result.insertId;
  },

  async findInvoiceByAccountId(accountId) {
    const [rows] = await query(
      `SELECT * FROM fel_invoices
       WHERE account_id = ? AND status != 'voided'
       ORDER BY id DESC LIMIT 1`,
      [accountId]
    );
    return rows[0] || null;
  },

  async findInvoiceByUuid(uuid) {
    const [rows] = await query(`SELECT * FROM fel_invoices WHERE uuid = ? LIMIT 1`, [uuid]);
    return rows[0] || null;
  },

  async markInvoiceVoided(uuid, reason) {
    await query(
      `UPDATE fel_invoices
       SET status = 'voided', void_reason = ?, voided_at = NOW()
       WHERE uuid = ?`,
      [reason, uuid]
    );
  },

  async getAccountBillingDetails(accountId) {
    const [accRows] = await query(
      `SELECT a.*, t.code as table_code, u.full_name as waiter_name
       FROM accounts a
       LEFT JOIN tables t ON a.table_id = t.id
       LEFT JOIN staff_users u ON a.waiter_id = u.id
       WHERE a.id = ? LIMIT 1`,
      [accountId]
    );
    if (!accRows.length) return null;

    const [itemRows] = await query(
      `SELECT oi.id, oi.product_id, oi.qty, oi.unit_price, oi.line_total, oi.notes,
              p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.account_id = ? AND oi.voided_at IS NULL
       ORDER BY oi.id ASC`,
      [accountId]
    );

    return {
      account: accRows[0],
      items: itemRows,
    };
  }
};

module.exports = felRepository;
