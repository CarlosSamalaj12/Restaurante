// src/modules/pms/pms.service.js
// Lógica de negocio para integración Hotel PMS, verificación de crédito y cargos a habitación

const pmsRepository = require("./pms.repository");
const { BadRequestError, NotFoundError } = require("../../common/errors");

const pmsService = {
  /**
   * Obtiene la configuración del PMS.
   */
  async getConfig() {
    const config = await pmsRepository.findConfig();
    return (
      config || {
        id: 1,
        is_enabled: 1,
        base_url: "",
        api_key: "",
        sandbox_mode: 1,
      }
    );
  },

  /**
   * Actualiza la configuración de la integración con el PMS.
   */
  async updateConfig(data) {
    const { is_enabled, base_url, api_key, sandbox_mode } = data || {};
    await pmsRepository.updateConfig({
      isEnabled: is_enabled !== undefined ? Number(is_enabled) : undefined,
      baseUrl: base_url !== undefined ? String(base_url).trim() : undefined,
      apiKey: api_key !== undefined ? String(api_key).trim() : undefined,
      sandboxMode: sandbox_mode !== undefined ? Number(sandbox_mode) : undefined,
    });
    return this.getConfig();
  },

  /**
   * Búsqueda de habitaciones y huéspedes para validación de crédito.
   */
  async lookupRoom(searchQuery = "") {
    const config = await this.getConfig();

    if (!config.is_enabled) {
      throw new BadRequestError("La integración con Hotel PMS está deshabilitada en la configuración.");
    }

    // Modo Sandbox local o sin URL externa configurada
    if (config.sandbox_mode || !config.base_url) {
      const rooms = await pmsRepository.findSandboxRooms(searchQuery);
      return {
        ok: true,
        source: "sandbox",
        results: rooms.map((r) => ({
          room_number: r.room_number,
          room_type: r.room_type,
          guest: {
            id: r.id,
            full_name: r.guest_name,
            doc_number: r.doc_number || "",
          },
          reservation: {
            id: r.id,
            folio_id: r.id,
            check_in: r.check_in,
            check_out: r.check_out,
            status: r.status,
          },
          credit: {
            post_allowed: Boolean(r.post_allowed),
            credit_limit: Number(r.credit_limit || 0),
            current_balance: Number(r.current_balance || 0),
            available_credit: Number(r.available_credit || 0),
            currency: "GTQ",
          },
        })),
      };
    }

    // Modo Producción con PMS Externo vía HTTP REST
    try {
      const url = `${config.base_url.replace(/\/+$/, "")}/rooms/lookup?query=${encodeURIComponent(searchQuery)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-PMS-API-Key": config.api_key || "",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`El PMS respondió con código de error ${res.status}`);
      }

      const data = await res.json();
      return {
        ok: true,
        source: "external_pms",
        results: data.results || [],
      };
    } catch (err) {
      console.error("[PMS] Error en consulta externa:", err.message);
      throw new BadRequestError(`No se pudo comunicar con el sistema Hotel PMS: ${err.message}`);
    }
  },

  /**
   * Aplica un cargo a la habitación del huésped.
   */
  async postCharge(payload) {
    const config = await this.getConfig();

    if (!config.is_enabled) {
      throw new BadRequestError("La integración con Hotel PMS está deshabilitada.");
    }

    const {
      room_number,
      account_id,
      check_number = "",
      amount,
      financials = {},
      items = [],
      notes = "",
    } = payload || {};

    const amountNum = Number(amount || 0);
    if (!room_number || !amountNum || amountNum <= 0) {
      throw new BadRequestError("Número de habitación y monto válido (> 0) son obligatorios.");
    }

    // ─── 1. Procesamiento en Modo Sandbox Local ───
    if (config.sandbox_mode || !config.base_url) {
      const room = await pmsRepository.findSandboxRoomByNumber(room_number);
      if (!room) {
        throw new NotFoundError(`La habitación ${room_number} no fue encontrada en el sistema.`);
      }

      if (!room.post_allowed) {
        throw new BadRequestError(`La habitación ${room_number} está configurada como 'Sin Crédito' (No-Post).`);
      }

      const available = Number(room.available_credit || 0);
      if (amountNum > available + 0.01) {
        throw new BadRequestError(
          `El monto (Q${amountNum.toFixed(2)}) excede el crédito disponible de la habitación (Q${available.toFixed(2)}). Usa la opción de Pago Mixto.`
        );
      }

      const trxId = `TRX-PMS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      // Guardar el cargo en el registro local
      await pmsRepository.insertFolioCharge({
        transactionId: trxId,
        roomNumber: room.room_number,
        guestName: room.guest_name,
        accountId: Number(account_id || 0),
        checkNumber: String(check_number || ""),
        amount: amountNum,
        subtotalFood: Number(financials.subtotal_food || 0),
        subtotalBeverage: Number(financials.subtotal_beverage || 0),
        subtotalOther: Number(financials.subtotal_other || 0),
        tipAmount: Number(financials.tip_amount || 0),
        taxAmount: Number(financials.tax_amount || 0),
      });

      // Actualizar el saldo consumido de la habitación
      await pmsRepository.updateSandboxRoomBalance(room.room_number, amountNum);

      const prevBal = Number(room.current_balance || 0);
      const newBal = prevBal + amountNum;
      const remCredit = Math.max(0, Number(room.credit_limit || 0) - newBal);

      return {
        ok: true,
        transaction_id: trxId,
        room_number: room.room_number,
        guest_name: room.guest_name,
        amount_charged: amountNum,
        previous_balance: prevBal,
        new_balance: newBal,
        remaining_credit: remCredit,
        timestamp: new Date().toISOString(),
        is_sandbox: true,
      };
    }

    // ─── 2. Procesamiento con PMS Externo ───
    try {
      const url = `${config.base_url.replace(/\/+$/, "")}/charges`;
      const idempotencyKey = `POS-CHK-${check_number || account_id}-${Date.now()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PMS-API-Key": config.api_key || "",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del PMS (${res.status})`);
      }

      const data = await res.json();

      // Guardar registro local de auditoría
      await pmsRepository.insertFolioCharge({
        transactionId: data.transaction_id || `EXT-${Date.now()}`,
        roomNumber: String(room_number),
        guestName: data.guest_name || "Huésped PMS",
        accountId: Number(account_id || 0),
        checkNumber: String(check_number || ""),
        amount: amountNum,
        subtotalFood: Number(financials.subtotal_food || 0),
        subtotalBeverage: Number(financials.subtotal_beverage || 0),
        subtotalOther: Number(financials.subtotal_other || 0),
        tipAmount: Number(financials.tip_amount || 0),
        taxAmount: Number(financials.tax_amount || 0),
      });

      return {
        ok: true,
        transaction_id: data.transaction_id,
        room_number: room_number,
        guest_name: data.guest_name || "Huésped PMS",
        amount_charged: amountNum,
        previous_balance: data.previous_balance,
        new_balance: data.new_balance,
        remaining_credit: data.remaining_credit,
        timestamp: data.timestamp || new Date().toISOString(),
        is_sandbox: false,
      };
    } catch (err) {
      console.error("[PMS] Error al aplicar cargo externo:", err.message);
      throw new BadRequestError(`Fallo al aplicar cargo a habitación en PMS: ${err.message}`);
    }
  },

  /**
   * Reversa o anula un cargo aplicado a la habitación.
   */
  async reverseCharge(transactionId, reason = "") {
    const config = await this.getConfig();
    const cleanTrx = String(transactionId).trim();

    if (!cleanTrx) throw new BadRequestError("Transaction ID requerido");

    const charge = await pmsRepository.findChargeByTransactionId(cleanTrx);
    if (!charge) throw new NotFoundError("Cargo a habitación no encontrado");

    if (config.sandbox_mode || !config.base_url) {
      await pmsRepository.reverseFolioCharge(cleanTrx);
      // Descontar saldo en sandbox
      await pmsRepository.updateSandboxRoomBalance(charge.room_number, -Number(charge.amount));
      return {
        ok: true,
        reversed: true,
        transaction_id: cleanTrx,
        amount_reversed: Number(charge.amount),
        room_number: charge.room_number,
      };
    }

    // Modo externo
    try {
      const url = `${config.base_url.replace(/\/+$/, "")}/charges/${encodeURIComponent(cleanTrx)}/reverse`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PMS-API-Key": config.api_key || "",
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        throw new Error(`Error del PMS al reversar (${res.status})`);
      }

      await pmsRepository.reverseFolioCharge(cleanTrx);
      return { ok: true, reversed: true, transaction_id: cleanTrx };
    } catch (err) {
      throw new BadRequestError(`Error al reversar cargo en PMS: ${err.message}`);
    }
  },

  /**
   * Prueba la conectividad con el PMS.
   */
  async testConnection() {
    const config = await this.getConfig();

    if (!config.is_enabled) {
      return { ok: false, message: "La integración con Hotel PMS está desactivada." };
    }

    if (config.sandbox_mode || !config.base_url) {
      const rooms = await pmsRepository.findSandboxRooms();
      return {
        ok: true,
        mode: "sandbox",
        message: `Modo Sandbox Activo. ${rooms.length} habitaciones de prueba listas para usar.`,
        rooms_count: rooms.length,
      };
    }

    const startTime = Date.now();
    try {
      const url = `${config.base_url.replace(/\/+$/, "")}/rooms/lookup?query=test`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        headers: { "X-PMS-API-Key": config.api_key || "" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      if (res.ok) {
        return {
          ok: true,
          mode: "external",
          message: `Conexión exitosa con el Hotel PMS (${latency}ms).`,
          latency_ms: latency,
        };
      }
      return {
        ok: false,
        mode: "external",
        message: `El servidor PMS respondió con status ${res.status}. Verifica la URL y la API Key.`,
      };
    } catch (err) {
      return {
        ok: false,
        mode: "external",
        message: `No se pudo conectar al PMS: ${err.message}`,
      };
    }
  },

  /**
   * Obtiene el historial reciente de cargos a habitaciones.
   */
  async getRecentCharges(limit = 25) {
    return pmsRepository.findRecentCharges(limit);
  },
};

module.exports = pmsService;
