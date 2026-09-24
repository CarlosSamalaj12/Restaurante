// src/modules/tables/tables.service.js
// Lógica de negocio para gestión de mesas y áreas

const tablesRepository = require("./tables.repository");
const { BadRequestError, NotFoundError } = require("../../common/errors");

const tablesService = {
  /**
   * Obtiene las mesas con su estado actual y cuentas abiertas.
   */
  async getTables(centerId = 0) {
    return tablesRepository.getTablesWithActivity(Number(centerId) || 0);
  },

  /**
   * Obtiene una mesa por ID.
   */
  async getTableById(tableId) {
    const table = await tablesRepository.findById(tableId);
    if (!table) {
      throw new NotFoundError("Mesa no encontrada");
    }
    return table;
  },

  /**
   * Crea una nueva mesa.
   */
  async createTable({ code, seats = 4, isActive = 1, centerId, areaId = null }) {
    if (!code || !centerId) {
      throw new BadRequestError("centerId y code son requeridos");
    }

    const resolvedAreaId = areaId ? Number(areaId) : await tablesRepository.getFirstAreaId();
    const insertId = await tablesRepository.createTable({
      areaId: resolvedAreaId,
      centerId: Number(centerId),
      code: String(code).trim(),
      seats: Number(seats) || 4,
      isActive: Number(isActive) ? 1 : 0,
    });

    return { ok: true, tableId: insertId };
  },

  /**
   * Actualiza una mesa existente.
   */
  async updateTable(tableId, { code, seats = 4, isActive = 1, centerId, areaId = null }) {
    const parsedTableId = Number(tableId);
    if (!parsedTableId || !code || !centerId) {
      throw new BadRequestError("tableId, centerId y code son requeridos");
    }

    const resolvedAreaId = areaId ? Number(areaId) : await tablesRepository.getFirstAreaId();
    await tablesRepository.updateTable(parsedTableId, {
      areaId: resolvedAreaId,
      centerId: Number(centerId),
      code: String(code).trim(),
      seats: Number(seats) || 4,
      isActive: Number(isActive) ? 1 : 0,
    });

    return { ok: true };
  },

  /**
   * Elimina una mesa asegurándose de que no tenga cuentas activas o asociadas.
   */
  async deleteTable(tableId) {
    const parsedTableId = Number(tableId);
    if (!parsedTableId) {
      throw new BadRequestError("tableId es requerido");
    }

    const count = await tablesRepository.countAccounts(parsedTableId);
    if (count > 0) {
      throw new BadRequestError("No se puede eliminar la mesa porque tiene cuentas asociadas");
    }

    await tablesRepository.deleteTable(parsedTableId);
    return { ok: true };
  },

  /**
   * Crea un área de servicio.
   */
  async createArea({ name, isActive = 1, sortOrder = 0 }) {
    if (!name || !String(name).trim()) {
      throw new BadRequestError("name es requerido");
    }

    const insertId = await tablesRepository.createArea({
      name: String(name).trim(),
      isActive: Number(isActive) ? 1 : 0,
      sortOrder: Number(sortOrder) || 0,
    });

    return { areaId: insertId };
  },

  /**
   * Actualiza un área existente.
   */
  async updateArea(areaId, { name, isActive = 1, sortOrder = 0 }) {
    const parsedAreaId = Number(areaId);
    if (!parsedAreaId || !name || !String(name).trim()) {
      throw new BadRequestError("areaId y name son requeridos");
    }

    await tablesRepository.updateArea(parsedAreaId, {
      name: String(name).trim(),
      isActive: Number(isActive) ? 1 : 0,
      sortOrder: Number(sortOrder) || 0,
    });

    return { ok: true };
  },
};

module.exports = tablesService;
