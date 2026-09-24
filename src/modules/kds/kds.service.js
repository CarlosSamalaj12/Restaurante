// src/modules/kds/kds.service.js
// Lógica de negocio para visualización de comandas en cocina, despacho y estadísticas

const kdsRepository = require("./kds.repository");
const accountsService = require("../accounts/accounts.service");
const { BadRequestError, NotFoundError } = require("../../common/errors");

const kdsService = {
  /**
   * Obtiene las órdenes activas en preparación para el KDS agrupadas por ticket.
   */
  async getActiveOrders(centerId = null) {
    const items = await kdsRepository.findActiveOrders(centerId);
    const activeItems = items.filter((i) => !i.completed_at);

    if (!activeItems.length) {
      return { orders: [], categories: [] };
    }

    const itemIds = activeItems.map((i) => Number(i.item_id));
    const mods = await kdsRepository.findModifiersForItemIds(itemIds);

    const modsByItem = mods.reduce((acc, m) => {
      const key = Number(m.item_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(m.name);
      return acc;
    }, {});

    const ticketsMap = new Map();
    const categoryCounts = {};

    for (const item of activeItems) {
      const key = `A-${item.account_id}`;
      const centerName = item.center_name || "Restaurante";

      categoryCounts[centerName] = (categoryCounts[centerName] || 0) + Number(item.qty);

      if (!ticketsMap.has(key)) {
        ticketsMap.set(key, {
          accountId: Number(item.account_id),
          checkNumber: item.check_number,
          tableCode: item.table_code,
          waiterName: item.waiter_name,
          guestCount: item.guest_count,
          centerName,
          sentAt: item.sent_at,
          items: [],
        });
      }

      ticketsMap.get(key).items.push({
        itemId: Number(item.item_id),
        productName: item.product_name,
        qty: Number(item.qty),
        seatNo: Number(item.seat_no),
        notes: item.notes || "",
        modifiers: modsByItem[Number(item.item_id)] || [],
        sentAt: item.sent_at,
      });
    }

    const tickets = [...ticketsMap.values()];
    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }));

    return { orders: tickets, categories };
  },

  /**
   * Obtiene órdenes incluyendo los ítems anulados para mostrar alertas en cocina.
   */
  async getOrdersWithVoided(centerId = null) {
    const items = await kdsRepository.findOrdersWithVoided(centerId);
    if (!items.length) {
      return { orders: [], categories: [] };
    }

    const itemIds = items.map((i) => Number(i.item_id));
    const mods = await kdsRepository.findModifiersForItemIds(itemIds);

    const modsByItem = mods.reduce((acc, m) => {
      const key = Number(m.item_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(m.name);
      return acc;
    }, {});

    const ticketsMap = new Map();
    const categoryCounts = {};

    for (const item of items) {
      const key = `A-${item.account_id}`;
      const centerName = item.center_name || "Restaurante";

      if (item.item_status === "active") {
        categoryCounts[centerName] = (categoryCounts[centerName] || 0) + Number(item.qty);
      }

      if (!ticketsMap.has(key)) {
        ticketsMap.set(key, {
          accountId: Number(item.account_id),
          checkNumber: item.check_number,
          tableCode: item.table_code,
          waiterName: item.waiter_name,
          guestCount: item.guest_count,
          centerName,
          sentAt: item.sent_at,
          items: [],
        });
      }

      const isCompleted = item.item_status === "active" && Boolean(item.completed_at) && item.completed_at !== "null";

      ticketsMap.get(key).items.push({
        itemId: Number(item.item_id),
        productName: item.product_name,
        qty: Number(item.qty),
        seatNo: Number(item.seat_no),
        notes: item.notes || "",
        modifiers: modsByItem[Number(item.item_id)] || [],
        sentAt: item.sent_at,
        voided: item.item_status === "void",
        voidReason: item.void_reason || "",
        voidedAt: item.voided_at,
        completed: isCompleted,
        categoryName: item.category_name || "Otros",
        centerId: Number(item.center_id) || null,
        centerName: item.center_name || "Restaurante",
      });
    }

    const tickets = [...ticketsMap.values()];
    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }));

    return { orders: tickets, categories };
  },

  /**
   * Marca un ítem individual como completado en cocina.
   */
  async markItemDone(itemId, userId = null) {
    const parsedItemId = Number(itemId);
    if (!parsedItemId) throw new BadRequestError("itemId inválido");

    const item = await kdsRepository.findItemById(parsedItemId);
    if (!item) throw new NotFoundError("Item no encontrado");
    if (String(item.status) !== "active") {
      throw new BadRequestError("El item no esta activo");
    }

    await kdsRepository.markItemDone(parsedItemId);
    await accountsService.addAccountEvent(
      Number(item.account_id),
      "kds_item_done",
      { itemId: parsedItemId },
      userId
    );

    return { ok: true };
  },

  /**
   * Marca todos los platillos activos de una comanda como listos.
   */
  async markAccountDone(accountId, userId = null) {
    const parsedAccountId = Number(accountId);
    if (!parsedAccountId) throw new BadRequestError("accountId inválido");

    const affectedRows = await kdsRepository.markAccountItemsDone(parsedAccountId);
    await accountsService.addAccountEvent(
      parsedAccountId,
      "kds_all_done",
      { affectedRows },
      userId
    );

    return { ok: true, affectedRows };
  },

  /**
   * Historial de platillos completados.
   */
  async getCompletedItems({ centerId = null, limit = 50 }) {
    const items = await kdsRepository.findCompletedItems({ centerId, limit });
    return { items };
  },

  /**
   * Historial de platillos anulados.
   */
  async getVoidedItems({ centerId = null, limit = 20 }) {
    const items = await kdsRepository.findVoidedItems({ centerId, limit });
    return { items };
  },

  /**
   * Lista de centros de producción activos.
   */
  async getProductionCenters() {
    const centers = await kdsRepository.findProductionCenters();
    return { centers };
  },

  /**
   * Reporte de tiempos de preparación y métricas por categoría.
   */
  async getKdsReport({ date = null, centerId = null, limit = 100 }) {
    const items = await kdsRepository.findKdsReportItems({ date, centerId, limit });

    const totalItems = items.length;
    const totalQty = items.reduce((sum, i) => sum + Number(i.qty), 0);
    const avgTime = totalItems > 0
      ? Math.round(items.reduce((sum, i) => sum + Number(i.prep_time_minutes || 0), 0) / totalItems)
      : 0;
    const minTime = totalItems > 0 ? Math.min(...items.map((i) => Number(i.prep_time_minutes || 0))) : 0;
    const maxTime = totalItems > 0 ? Math.max(...items.map((i) => Number(i.prep_time_minutes || 0))) : 0;

    const byCategory = {};
    items.forEach((item) => {
      const cat = item.category_name || "Otros";
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, totalTime: 0 };
      }
      byCategory[cat].count += Number(item.qty);
      byCategory[cat].totalTime += Number(item.prep_time_minutes || 0);
    });

    const categoryStats = Object.entries(byCategory)
      .map(([name, data]) => ({
        category: name,
        items: data.count,
        avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      }))
      .sort((a, b) => b.items - a.items);

    return {
      items,
      stats: {
        totalItems,
        totalQty,
        avgTime,
        minTime,
        maxTime,
        byCategory: categoryStats,
      },
    };
  },
};

module.exports = kdsService;
