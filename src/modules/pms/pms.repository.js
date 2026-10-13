// src/modules/pms/pms.repository.js
// Consultas y persistencia para la integración con Hotel PMS y Sandbox local

const { query, safeExec } = require("../../common/db");
const { nowSql } = require("../../common/utils");

const pmsRepository = {
  /**
   * Obtiene la configuración del PMS.
   */
  async findConfig() {
    const [rows] = await query(`SELECT * FROM pms_config WHERE id = 1 LIMIT 1`);
    return rows[0] || null;
  },

  /**
   * Actualiza la configuración de conexión con el PMS.
   */
  async updateConfig({ isEnabled, baseUrl, apiKey, sandboxMode }) {
    await query(
      `UPDATE pms_config 
       SET is_enabled = COALESCE(?, is_enabled),
           base_url = COALESCE(?, base_url),
           api_key = COALESCE(?, api_key),
           sandbox_mode = COALESCE(?, sandbox_mode)
       WHERE id = 1`,
      [isEnabled, baseUrl, apiKey, sandboxMode]
    );
  },

  /**
   * Busca habitaciones en el sandbox local por número de habitación o nombre del huésped.
   */
  async findSandboxRooms(searchQuery = "") {
    const q = String(searchQuery || "").trim();
    if (!q) {
      const [rows] = await query(
        `SELECT id, room_number, room_type, guest_name, doc_number, check_in, check_out,
                status, post_allowed, credit_limit, current_balance,
                GREATEST(0, (credit_limit - current_balance)) AS available_credit
         FROM pms_sandbox_rooms 
         ORDER BY room_number ASC`
      );
      return rows;
    }

    const pattern = `%${q}%`;
    const [rows] = await query(
      `SELECT id, room_number, room_type, guest_name, doc_number, check_in, check_out,
              status, post_allowed, credit_limit, current_balance,
              GREATEST(0, (credit_limit - current_balance)) AS available_credit
       FROM pms_sandbox_rooms 
       WHERE room_number LIKE ? OR guest_name LIKE ?
       ORDER BY room_number ASC`,
      [pattern, pattern]
    );
    return rows;
  },

  /**
   * Obtiene una habitación del sandbox por su número.
   */
  async findSandboxRoomByNumber(roomNumber) {
    const [rows] = await query(
      `SELECT id, room_number, room_type, guest_name, doc_number, check_in, check_out,
              status, post_allowed, credit_limit, current_balance,
              GREATEST(0, (credit_limit - current_balance)) AS available_credit
       FROM pms_sandbox_rooms 
       WHERE room_number = ? LIMIT 1`,
      [String(roomNumber).trim()]
    );
    return rows[0] || null;
  },

  /**
   * Incrementa el saldo consumido en una habitación del sandbox local.
   */
  async updateSandboxRoomBalance(roomNumber, amount) {
    await query(
      `UPDATE pms_sandbox_rooms 
       SET current_balance = current_balance + ? 
       WHERE room_number = ?`,
      [Number(amount), String(roomNumber).trim()]
    );
  },

  /**
   * Registra un cargo aplicado a folio de habitación.
   */
  async insertFolioCharge(charge) {
    const {
      transactionId,
      roomNumber,
      guestName,
      accountId,
      checkNumber = "",
      amount,
      subtotalFood = 0,
      subtotalBeverage = 0,
      subtotalOther = 0,
      tipAmount = 0,
      taxAmount = 0,
    } = charge;

    const [result] = await query(
      `INSERT INTO pms_folio_charges 
       (transaction_id, room_number, guest_name, account_id, check_number, amount, 
        subtotal_food, subtotal_beverage, subtotal_other, tip_amount, tax_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?)`,
      [
        transactionId,
        roomNumber,
        guestName,
        accountId,
        checkNumber,
        amount,
        subtotalFood,
        subtotalBeverage,
        subtotalOther,
        tipAmount,
        taxAmount,
        nowSql(),
      ]
    );
    return result.insertId;
  },

  /**
   * Reversa un cargo registrado.
   */
  async reverseFolioCharge(transactionId) {
    const [result] = await query(
      `UPDATE pms_folio_charges SET status = 'reversed' WHERE transaction_id = ?`,
      [transactionId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Busca un cargo por su Transaction ID.
   */
  async findChargeByTransactionId(transactionId) {
    const [rows] = await query(
      `SELECT * FROM pms_folio_charges WHERE transaction_id = ? LIMIT 1`,
      [transactionId]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene los últimos cargos a habitaciones registrados en el POS.
   */
  async findRecentCharges(limit = 25) {
    const [rows] = await query(
      `SELECT * FROM pms_folio_charges ORDER BY id DESC LIMIT ?`,
      [Number(limit) || 25]
    );
    return rows;
  },
};

module.exports = pmsRepository;
