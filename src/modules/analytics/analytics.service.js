// src/modules/analytics/analytics.service.js
// Servicio de analítica y métricas ejecutivas en tiempo real

const analyticsRepository = require("./analytics.repository");
const { BadRequestError } = require("../../common/errors");

const analyticsService = {
  /**
   * Obtiene la estructura completa para el Dashboard Ejecutivo con filtros aplicados.
   */
  async getDashboardData(filters = {}) {
    const {
      startDate,
      endDate,
      centerId,
      areaId,
      waiterId,
      method,
      shiftId,
    } = filters;

    // Validación de fechas si se proporcionan
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new BadRequestError("Formato de startDate inválido (debe ser YYYY-MM-DD)");
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new BadRequestError("Formato de endDate inválido (debe ser YYYY-MM-DD)");
    }

    const [metrics, options] = await Promise.all([
      analyticsRepository.getExecutiveMetrics({
        startDate: startDate || null,
        endDate: endDate || null,
        centerId: centerId ? Number(centerId) : null,
        areaId: areaId ? Number(areaId) : null,
        waiterId: waiterId ? Number(waiterId) : null,
        method: method ? String(method).trim() : null,
        shiftId: shiftId ? Number(shiftId) : null,
      }),
      analyticsRepository.getFilterOptions(),
    ]);

    return {
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        centerId: centerId ? Number(centerId) : null,
        areaId: areaId ? Number(areaId) : null,
        waiterId: waiterId ? Number(waiterId) : null,
        method: method || null,
        shiftId: shiftId ? Number(shiftId) : null,
      },
      options,
      ...metrics,
      generatedAt: new Date().toISOString(),
    };
  },
};

module.exports = analyticsService;
