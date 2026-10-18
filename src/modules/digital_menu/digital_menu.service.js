// src/modules/digital_menu/digital_menu.service.js
// Lógica de negocio para Menú Digital, Sesiones de Comensal, Auto-Comandas y Generación QR

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("sharp no disponible, subiendo imagen en formato original");
}
const digitalMenuRepository = require("./digital_menu.repository");
const ordersRepository = require("../orders/orders.repository");
const ordersService = require("../orders/orders.service");
const accountsRepository = require("../accounts/accounts.repository");
const accountsService = require("../accounts/accounts.service");
const tablesRepository = require("../tables/tables.repository");
const settingsRepository = require("../settings/settings.repository");
const { generateTableToken, generateRandomSalt } = require("./middleware/validateTableToken");
const { withTransaction } = require("../../common/db");
const { money } = require("../../common/utils");
const { BadRequestError, NotFoundError, ForbiddenError } = require("../../common/errors");
const { emitEvent } = require("../../common/sockets");

const digitalMenuService = {
  // ─── Control de Módulo Premium (Exclusivo Superadmin) ───
  async isModuleEnabled() {
    return digitalMenuRepository.isModuleEnabled();
  },

  async toggleModuleEnabled(enabled, authUser) {
    const role = String(authUser?.role || "").toLowerCase();
    if (role !== "superadmin") {
      throw new ForbiddenError("Únicamente el Super Administrador puede activar o desactivar este módulo Premium.");
    }
    await digitalMenuRepository.setModuleEnabled(enabled);
    emitEvent("settings:module_digital_menu_toggled", { enabled });
    return { enabled };
  },

  // ─── Menú Público para Comensales ───
  async getPublicMenu(slug, tableContext = null) {
    let menu = null;
    if (slug === "default") {
      const menus = await digitalMenuRepository.getMenus(true);
      menu = menus[0] || null;
    } else {
      menu = await digitalMenuRepository.getMenuBySlug(slug);
    }

    if (!menu) throw new NotFoundError("Menú no encontrado o inactivo");
    if (!menu.is_active) throw new ForbiddenError("Este menú se encuentra temporalmente inactivo");

    const categories = await digitalMenuRepository.getMenuCategories(menu.id);
    const products = await digitalMenuRepository.getMenuProducts(menu.id);
    const promotions = await digitalMenuRepository.getPromotions(menu.id);

    let tableInfo = null;
    if (tableContext) {
      const openAccounts = await digitalMenuRepository.findOpenAccountsForTable(tableContext.tableId);
      tableInfo = {
        tableId: tableContext.tableId,
        tableCode: tableContext.tableCode,
        hasOpenAccounts: openAccounts.length > 0,
        openAccountsCount: openAccounts.length,
        openAccounts: openAccounts.map((a) => ({
          accountId: a.id,
          checkNumber: a.check_number,
          openedAt: a.opened_at,
          guestCount: a.guest_count,
        })),
      };
    }

    let logoUrl = menu.logo_url;
    if (!logoUrl) {
      try {
        logoUrl = await settingsRepository.getLogoUrl();
      } catch (_) {}
    }

    return {
      menu: {
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        description: menu.description,
        mode: menu.mode,
        primary_color: menu.primary_color,
        secondary_color: menu.secondary_color,
        bg_color: menu.bg_color,
        text_color: menu.text_color,
        font_family: menu.font_family,
        logo_url: logoUrl || null,
        banner_url: menu.banner_url,
        social_links: menu.social_links || {},
      },
      categories,
      products,
      promotions,
      table: tableInfo,
    };
  },

  async getProductDetail(productId) {
    const detail = await digitalMenuRepository.getProductDetail(Number(productId));
    if (!detail) throw new NotFoundError("Platillo no disponible");
    return detail;
  },

  // ─── Vinculación de Dispositivo a Cuenta (Device Binding) ───
  async bindDeviceSession({ tableId, deviceFingerprint, guestAlias = "Comensal", joinAccountId = null, menuId }) {
    const parsedTableId = Number(tableId);
    if (!parsedTableId) throw new BadRequestError("tableId es requerido");
    if (!deviceFingerprint) throw new BadRequestError("deviceFingerprint es requerido");

    const table = await tablesRepository.findById(parsedTableId);
    if (!table) throw new NotFoundError("Mesa no encontrada");

    // 1. Verificar si este dispositivo ya tiene una sesión activa con cuenta abierta en esta mesa
    const existingSession = await digitalMenuRepository.findActiveSession(parsedTableId, deviceFingerprint);
    if (existingSession && String(existingSession.account_status) === "open") {
      return {
        sessionToken: existingSession.session_token,
        accountId: existingSession.account_id,
        checkNumber: existingSession.check_number,
        guestAlias: existingSession.guest_alias,
        tableCode: table.code,
        isExisting: true,
      };
    }

    let targetAccountId = null;

    // 2. Si el comensal eligió unirse a una cuenta existente en la mesa
    if (joinAccountId) {
      const openAccounts = await digitalMenuRepository.findOpenAccountsForTable(parsedTableId);
      const matched = openAccounts.find((a) => Number(a.id) === Number(joinAccountId));
      if (!matched) {
        throw new BadRequestError("La cuenta seleccionada ya no está disponible");
      }
      targetAccountId = matched.id;
    } else {
      // 3. Crear una nueva cuenta asignada al usuario virtual de auto-comanda (ID 9999)
      const opCenterId = Number(table.operation_center_id || 0);
      const openShift = await accountsRepository.findOpenShift(opCenterId);
      const shiftId = openShift ? openShift.id : null;

      const tempCheckNumber = `TMP-QR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

      targetAccountId = await withTransaction(async (conn) => {
        const accId = await accountsRepository.createAccountRecord(
          {
            tableId: parsedTableId,
            centerId: opCenterId,
            waiterId: 9999, // Usuario virtual 'Auto-Comanda'
            shiftId,
            customerId: null,
            guestCount: 1,
            tempCheckNumber,
          },
          conn
        );

        const checkNumber = `CHK-${String(Number(accId)).padStart(4, "0")}`;
        await accountsRepository.updateCheckNumber(accId, checkNumber, conn);

        // Marcar origen como 'qr_guest'
        await conn.query(
          `UPDATE accounts SET order_source = 'qr_guest' WHERE id = ?`,
          [accId]
        );

        await accountsRepository.addEvent(
          accId,
          "account_opened_qr",
          { guestAlias, tableCode: table.code },
          9999,
          conn
        );

        return accId;
      });
    }

    // 4. Crear la sesión vinculada
    const sessionToken = crypto.randomUUID();
    await digitalMenuRepository.createDeviceSession({
      sessionToken,
      deviceFingerprint,
      tableId: parsedTableId,
      accountId: targetAccountId,
      menuId: Number(menuId || 1),
      guestAlias: String(guestAlias || "Comensal").slice(0, 50),
    });

    const account = await accountsRepository.findById(targetAccountId);

    return {
      sessionToken,
      accountId: targetAccountId,
      checkNumber: account?.check_number,
      guestAlias,
      tableCode: table.code,
      isExisting: false,
    };
  },

  async checkSessionStatus(sessionToken) {
    if (!sessionToken) return { active: false, valid: false };
    const session = await digitalMenuRepository.findSessionByToken(sessionToken);
    if (!session) return { active: false, valid: false };

    const isOpen = String(session.account_status) === "open" && String(session.status) === "active";
    if (!isOpen && session.status === "active") {
      await digitalMenuRepository.closeDeviceSession(sessionToken);
    }

    return {
      active: isOpen,
      valid: isOpen,
      accountId: session.account_id,
      checkNumber: session.check_number,
      tableCode: session.table_code,
      accountStatus: session.account_status,
      guestAlias: session.guest_alias,
    };
  },

  // ─── Envío de Auto-Comanda (Mesa QR o Kiosco) ───
  async sendGuestOrder({ sessionToken, tableContext, items, isKiosk = false, kioskDetails = {}, paymentMethod = "cash" }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError("El carrito está vacío");
    }

    let accountId = null;
    let tableCode = "";
    let orderSource = isKiosk ? "kiosk" : "qr_guest";
    let guestAlias = "Comensal";

    if (isKiosk) {
      // Flujo Kiosco: "Comer en Salón" o "Para Llevar"
      const { orderType, tableNumber, customerName } = kioskDetails || {};
      guestAlias = customerName || "Cliente Kiosco";

      // Determinar o crear mesa/cuenta de kiosco
      let kioskTableId = 1; // Fallback
      if (orderType === "dine_in" && tableNumber) {
        const [foundTable] = await tablesRepository.findByCode(String(tableNumber).trim());
        if (foundTable) kioskTableId = foundTable.id;
      }

      const tempCheck = `KIOSK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const table = await tablesRepository.findById(kioskTableId);
      tableCode = table ? table.code : "KIOSKO";

      accountId = await withTransaction(async (conn) => {
        const newAccId = await accountsRepository.createAccountRecord(
          {
            tableId: kioskTableId,
            centerId: table ? table.operation_center_id : 1,
            waiterId: 9999,
            shiftId: null,
            customerId: null,
            guestCount: 1,
            tempCheckNumber: tempCheck,
          },
          conn
        );
        const checkNumber = `KSC-${String(Number(newAccId)).padStart(4, "0")}`;
        await accountsRepository.updateCheckNumber(newAccId, checkNumber, conn);
        await conn.query(
          `UPDATE accounts SET order_source = 'kiosk', requested_payment_method = ? WHERE id = ?`,
          [paymentMethod, newAccId]
        );
        return newAccId;
      });
    } else {
      // Flujo QR en Mesa con Sesión
      if (!sessionToken) {
        throw new BadRequestError("Sesión de mesa no encontrada. Por favor escanea el código QR nuevamente.");
      }
      const session = await digitalMenuRepository.findSessionByToken(sessionToken);
      if (!session || String(session.account_status) !== "open") {
        throw new ForbiddenError("La cuenta de esta mesa ya no se encuentra abierta.");
      }
      accountId = session.account_id;
      tableCode = session.table_code;
      guestAlias = session.guest_alias;

      if (paymentMethod) {
        await accountsRepository.updateRequestedPaymentMethod(accountId, paymentMethod);
      }
    }

    // Insertar cada ítem recalculando su precio en el servidor
    for (const item of items) {
      await ordersService.addItemToAccount({
        accountId,
        productId: Number(item.productId),
        seatNo: Number(item.seatNo || 1),
        qty: Number(item.qty || 1),
        notes: String(item.notes || "").slice(0, 200),
        modifierOptionIds: (item.modifierOptionIds || []).map(Number),
      });
    }

    // Disparar comanda a cocina e impresión térmica
    const sendResult = await ordersService.sendOrder(accountId);

    const account = await accountsRepository.findById(accountId);

    // Notificación en tiempo real al POS y KDS (sin mesero)
    emitEvent("orders:self_service_new", {
      tableCode,
      checkNumber: account?.check_number,
      accountId,
      itemsCount: items.length,
      guestAlias,
      orderSource,
      requestedPaymentMethod: paymentMethod,
      alertMessage: `🔔 ¡Nueva auto-comanda en Mesa ${tableCode}! (Sin Mesero)`,
    });

    return {
      success: true,
      checkNumber: account?.check_number,
      accountId,
      tableCode,
      itemsSent: items.length,
      printTickets: sendResult?.destinations || [],
    };
  },

  // ─── Acciones de Comensal en Mesa ───
  async callWaiter(sessionToken, reason = "Asistencia en mesa") {
    if (!sessionToken) throw new BadRequestError("Token de sesión de mesa requerido");
    const session = await digitalMenuRepository.findSessionByToken(sessionToken);
    if (!session) throw new NotFoundError("Sesión de mesa inválida");
    if (session.account_status && session.account_status !== "open") {
      throw new BadRequestError("La sesión de esta mesa ya no se encuentra activa");
    }

    await accountsRepository.updateCallWaiterStatus(session.account_id, "requested");

    emitEvent("table:call_waiter", {
      tableId: session.table_id,
      tableCode: session.table_code,
      guestAlias: session.guest_alias,
      reason,
      timestamp: new Date().toISOString(),
    });

    return { ok: true, message: "Un mesero ha sido notificado y se acercará a tu mesa." };
  },

  async requestBill(sessionToken, paymentMethod = "card_pos") {
    if (!sessionToken) throw new BadRequestError("Token de sesión de mesa requerido");
    const session = await digitalMenuRepository.findSessionByToken(sessionToken);
    if (!session) throw new NotFoundError("Sesión de mesa inválida");
    if (session.account_status && session.account_status !== "open") {
      throw new BadRequestError("La cuenta de esta mesa ya no se encuentra abierta");
    }

    await accountsRepository.updateRequestedPaymentMethod(session.account_id, paymentMethod);

    emitEvent("table:request_bill", {
      tableId: session.table_id,
      tableCode: session.table_code,
      checkNumber: session.check_number,
      guestAlias: session.guest_alias,
      paymentMethod,
      timestamp: new Date().toISOString(),
    });

    return { ok: true, message: "La cuenta ha sido solicitada. En breve te atenderemos." };
  },

  async attendWaiterCall(tableId) {
    if (!tableId) throw new BadRequestError("ID de mesa requerido");
    await accountsRepository.dismissWaiterCallByTable(Number(tableId));
    emitEvent("table:call_waiter_dismissed", { tableId: Number(tableId) });
    return { ok: true, message: "Llamado de mesero marcado como atendido." };
  },

  async createReview({ productId, sessionToken, rating, comment, dinerName }) {
    const parsedRating = Math.max(1, Math.min(5, Number(rating)));
    let accountId = 1;
    if (sessionToken) {
      const session = await digitalMenuRepository.findSessionByToken(sessionToken);
      if (session) accountId = session.account_id;
    }

    const reviewId = await digitalMenuRepository.createReview({
      productId: Number(productId),
      accountId,
      rating: parsedRating,
      comment,
      dinerName: dinerName || "Comensal",
    });

    return { id: reviewId, rating: parsedRating };
  },

  // ─── Panel Administrativo (POS Settings) ───
  async getAdminMenus() {
    return digitalMenuRepository.getMenus(false);
  },

  async createMenu(data) {
    if (!data.name || !data.slug) {
      throw new BadRequestError("El nombre y el slug del menú son obligatorios");
    }
    const cleanSlug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const existing = await digitalMenuRepository.getMenuBySlug(cleanSlug);
    if (existing) throw new BadRequestError("Ya existe un menú con ese slug/identificador");

    const menuId = await digitalMenuRepository.createMenu({ ...data, slug: cleanSlug });

    // Si se enviaron categorías o productos en la creación, sincronizarlos
    if (data.categoryIds) {
      await digitalMenuRepository.syncMenuCategories(menuId, data.categoryIds);
    }
    if (data.productIds) {
      await digitalMenuRepository.syncMenuProducts(menuId, data.productIds);
    }

    return { id: menuId, slug: cleanSlug };
  },

  async updateMenu(id, data) {
    const menu = await digitalMenuRepository.getMenuById(Number(id));
    if (!menu) throw new NotFoundError("Menú no encontrado");

    if (data.slug) {
      data.slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const existing = await digitalMenuRepository.getMenuBySlug(data.slug);
      if (existing && existing.id !== Number(id)) {
        throw new BadRequestError("Ya existe otro menú con ese slug");
      }
    }

    await digitalMenuRepository.updateMenu(Number(id), data);

    if (data.categoryIds) {
      await digitalMenuRepository.syncMenuCategories(Number(id), data.categoryIds);
    }
    if (data.productIds) {
      await digitalMenuRepository.syncMenuProducts(Number(id), data.productIds);
    }

    return { ok: true };
  },

  async deleteMenu(id) {
    await digitalMenuRepository.deleteMenu(Number(id));
    return { ok: true };
  },

  // ─── Generación y Renovación de Códigos QR por Mesa ───
  async getTableTokens(menuId) {
    const rows = await digitalMenuRepository.getAllTableTokens(Number(menuId));
    const menu = await digitalMenuRepository.getMenuById(Number(menuId));

    // Si hay mesas activas sin token para este menú, generarlas automáticamente
    const enriched = [];
    for (const row of rows) {
      let tokenHash = row.token_hash;
      let salt = row.salt;

      if (!tokenHash) {
        salt = generateRandomSalt();
        tokenHash = generateTableToken(row.table_id || row.id, Number(menuId), salt);
        await digitalMenuRepository.upsertTableToken(row.table_id || row.id, Number(menuId), tokenHash, salt);
      }

      enriched.push({
        tableId: row.table_id || row.id,
        tableCode: row.table_code,
        areaName: row.area_name,
        seats: row.seats,
        tokenHash,
        url: `/m/${menu?.slug || "menu-principal"}?t=${tokenHash}`,
        regeneratedAt: row.regenerated_at,
      });
    }

    return enriched;
  },

  async regenerateTableToken(tableId, menuId) {
    const newSalt = generateRandomSalt();
    const newTokenHash = generateTableToken(Number(tableId), Number(menuId), newSalt);
    await digitalMenuRepository.regenerateTableToken(Number(tableId), Number(menuId), newTokenHash, newSalt);

    const menu = await digitalMenuRepository.getMenuById(Number(menuId));
    return {
      tableId: Number(tableId),
      menuId: Number(menuId),
      tokenHash: newTokenHash,
      url: `/m/${menu?.slug || "menu-principal"}?t=${newTokenHash}`,
    };
  },

  // ─── Promociones (Admin) ───
  async getPromotions(menuId) {
    return await digitalMenuRepository.getPromotions(Number(menuId));
  },

  async createPromotion(data) {
    if (!data.menu_id || !data.title || !data.image_url) {
      throw new BadRequestError("menu_id, title e image_url son requeridos");
    }
    const id = await digitalMenuRepository.createPromotion(data);
    return { id };
  },

  async deletePromotion(id) {
    await digitalMenuRepository.deletePromotion(Number(id));
    return { ok: true };
  },

  // ─── Subida y Optimización WebP de Imágenes (Logo, Banners, Platillos) ───
  async uploadImage(imageData, type = "logos", baseDir = null) {
    const raw = String(imageData || "").trim();
    if (!raw) throw new BadRequestError("imageData es requerido");

    const base64Match = raw.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new BadRequestError("Formato de imagen inválido. Usa PNG, JPG, GIF o WebP.");
    }

    const safeType = ["logos", "banners", "products"].includes(type) ? type : "products";
    const uploadsDir = path.join(baseDir || process.cwd(), "public", "uploads", "menu", safeType);

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const inputBuffer = Buffer.from(base64Match[2], "base64");
    let finalBuffer = inputBuffer;
    let ext = "webp";

    if (sharp) {
      try {
        finalBuffer = await sharp(inputBuffer)
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85, effort: 4 })
          .toBuffer();
      } catch (err) {
        console.warn("[WebP Convert Warning] Fallback al original:", err.message);
        ext = base64Match[1].replace("jpeg", "jpg");
        finalBuffer = inputBuffer;
      }
    } else {
      ext = base64Match[1].replace("jpeg", "jpg");
    }

    const fileName = `${safeType}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, finalBuffer);

    const imageUrl = `/uploads/menu/${safeType}/${fileName}`;
    return { ok: true, imageUrl, format: ext };
  },

  // ─── Actualización Rápida de Atributos de Platillo ───
  async updateProductDigitalInfo(productId, data) {
    if (!productId) throw new BadRequestError("productId es requerido");
    await digitalMenuRepository.updateProductDigitalInfo(Number(productId), {
      image_url: data.image_url !== undefined ? (data.image_url ? String(data.image_url).trim() : null) : undefined,
      description: data.description !== undefined ? (data.description ? String(data.description).trim() : null) : undefined,
      estimated_prep_min:
        data.estimated_prep_min !== undefined
          ? data.estimated_prep_min !== null && data.estimated_prep_min !== ""
            ? Number(data.estimated_prep_min)
            : null
          : undefined,
    });
    return { ok: true };
  },
};

module.exports = digitalMenuService;
