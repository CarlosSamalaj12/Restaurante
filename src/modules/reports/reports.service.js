// src/modules/reports/reports.service.js
// Servicio de lógica de negocio para la generación de reportes y estadísticas

const reportsRepository = require("./reports.repository");
const accountsService = require("../accounts/accounts.service");
const { BadRequestError } = require("../../common/errors");

const reportsService = {
  async getVoidedItemsReport() {
    const voidedRows = await reportsRepository.getVoidedItems();
    if (!voidedRows || voidedRows.length === 0) {
      return [];
    }

    const accountIds = [...new Set(voidedRows.map((r) => r.account_id))];
    const allItems = await reportsRepository.getAccountProducts(accountIds);

    const itemsByAccount = {};
    allItems.forEach((item) => {
      if (!itemsByAccount[item.account_id]) itemsByAccount[item.account_id] = [];
      itemsByAccount[item.account_id].push(item);
    });

    return voidedRows.map((row) => ({
      ...row,
      account_products: itemsByAccount[row.account_id] || [],
    }));
  },

  async getWaiterTipsReport({ startDate, endDate, waiterId, centerId }) {
    if (!startDate || !endDate) {
      throw new BadRequestError("startDate y endDate son requeridos");
    }

    const globalTipPercent = await reportsRepository.getTipPercent();
    const excludedMethods = await reportsRepository.getExcludedTipPaymentMethods();

    const accounts = await reportsRepository.getPaidAccountsForTips({
      startDate,
      endDate,
      waiterId,
      centerId,
    });

    const details = [];
    const byWaiter = {};

    for (const acc of accounts) {
      const methodsUsed = await reportsRepository.getPaymentMethodsForAccount(acc.id);
      const hasEligiblePayment = methodsUsed.some((m) => !excludedMethods.includes(m));
      const totals = await accountsService.getAccountTotals(acc.id);
      const effectiveTip = hasEligiblePayment ? totals.tipAmount : 0;

      const row = {
        accountId: acc.id,
        checkNumber: acc.check_number,
        closedAt: acc.closed_at,
        waiterId: acc.waiter_id,
        waiterName: acc.waiter_name,
        centerId: acc.operation_center_id,
        centerName: acc.center_name,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        tipPercent: totals.tipPercent,
        tipAmount: effectiveTip,
        tipEligible: hasEligiblePayment,
        paymentMethods: methodsUsed,
        total: totals.total,
      };
      details.push(row);

      const key = `${acc.waiter_id}-${acc.operation_center_id}`;
      if (!byWaiter[key]) {
        byWaiter[key] = {
          waiterId: acc.waiter_id,
          waiterName: acc.waiter_name,
          centerId: acc.operation_center_id,
          centerName: acc.center_name,
          accountCount: 0,
          eligibleCount: 0,
          totalSubtotal: 0,
          totalDiscounts: 0,
          totalTips: 0,
          totalGeneral: 0,
        };
      }
      byWaiter[key].accountCount++;
      if (hasEligiblePayment) byWaiter[key].eligibleCount++;
      byWaiter[key].totalSubtotal += totals.subtotal;
      byWaiter[key].totalDiscounts += totals.discountTotal;
      byWaiter[key].totalTips += effectiveTip;
      byWaiter[key].totalGeneral += totals.total;
    }

    return {
      globalTipPercent,
      excludedMethods,
      details,
      summary: Object.values(byWaiter),
    };
  },

  async getAccountTraceReport(accountId) {
    const id = Number(accountId);
    if (!id || id <= 0) {
      throw new BadRequestError("accountId inválido");
    }
    return reportsRepository.getAccountTrace(id);
  },

  async getProductSalesReport({ startDate, endDate, centerId, categoryId, productName }) {
    return reportsRepository.getProductSales({
      startDate,
      endDate,
      centerId,
      categoryId,
      productName,
    });
  },

  async getSalesByPaymentMethodReport({ startDate, endDate, centerId, method }) {
    return reportsRepository.getSalesByPaymentMethod({
      startDate,
      endDate,
      centerId,
      method,
    });
  },

  async getSalesByCenterReport({ startDate, endDate, centerId, productName, productIds }) {
    return reportsRepository.getSalesByCenter({
      startDate,
      endDate,
      centerId,
      productName,
      productIds,
    });
  },

  async getSalesByUserReport({ startDate, endDate, centerId, productIds, productName, categoryId, userIds }) {
    return reportsRepository.getSalesByUser({
      startDate,
      endDate,
      centerId,
      productIds,
      productName,
      categoryId,
      userIds,
    });
  },
};

module.exports = reportsService;
