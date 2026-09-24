// src/modules/cxc/cxc.service.js
// Lógica de negocio para Cuentas por Cobrar (CXC), pagos FIFO, estados de cuenta y exportación a Excel

const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const cxcRepository = require("./cxc.repository");
const { BadRequestError, NotFoundError } = require("../../common/errors");

// Utilidades internas para formato y estilo de Excel
function getLogoBuffer() {
  try {
    const logoPath = path.join(__dirname, "../../../public/uploads");
    if (!fs.existsSync(logoPath)) return null;
    const files = fs.readdirSync(logoPath).filter((f) => f.startsWith("logo_"));
    if (files.length) return fs.readFileSync(path.join(logoPath, files[0]));
  } catch {}
  return null;
}

function addBorders(ws, row, colStart, colEnd) {
  for (let c = colStart; c <= colEnd; c++) {
    ws.getCell(row, c).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }
}

function styleHeaderRow(ws, row, cols) {
  for (let c = 1; c <= cols; c++) {
    const cell = ws.getCell(row, c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
    cell.alignment = { horizontal: c >= cols - 2 ? "right" : "left", vertical: "center", wrapText: true };
  }
  addBorders(ws, row, 1, cols);
}

const cxcService = {
  // ─── Áreas ───
  async getAreas() {
    return cxcRepository.findAllAreas();
  },

  async createArea({ name, is_active = 1 }) {
    if (!name) throw new BadRequestError("Nombre requerido");
    const id = await cxcRepository.insertArea({ name: String(name).trim(), isActive: is_active });
    return { ok: true, id };
  },

  async updateArea(areaId, { name, is_active }) {
    const parsedId = Number(areaId);
    if (!parsedId) throw new BadRequestError("areaId inválido");
    await cxcRepository.updateArea(parsedId, { name, isActive: is_active });
    return { ok: true };
  },

  async deleteArea(areaId) {
    const parsedId = Number(areaId);
    if (!parsedId) throw new BadRequestError("areaId inválido");
    await cxcRepository.softDeleteArea(parsedId);
    return { ok: true };
  },

  // ─── Clientes ───
  async getClients() {
    return cxcRepository.findAllClients();
  },

  async createClient(data) {
    const { full_name, phone, credit_limit = 0, cxc_area_id, default_discount_percent = 0, is_active = 1 } = data || {};
    if (!full_name) throw new BadRequestError("Nombre requerido");

    const id = await cxcRepository.insertClient({
      fullName: String(full_name).trim(),
      phone: phone ? String(phone).trim() : null,
      creditLimit: Number(credit_limit) || 0,
      cxcAreaId: cxc_area_id ? Number(cxc_area_id) : null,
      defaultDiscountPercent: Number(default_discount_percent) || 0,
      isActive: Number(is_active) ?? 1,
    });

    return { ok: true, id };
  },

  async updateClient(clientId, data) {
    const parsedId = Number(clientId);
    if (!parsedId) throw new BadRequestError("clientId inválido");

    const { full_name, phone, credit_limit, cxc_area_id, default_discount_percent, is_active } = data || {};
    await cxcRepository.updateClient(parsedId, {
      fullName: full_name ? String(full_name).trim() : undefined,
      phone: phone !== undefined ? phone : undefined,
      creditLimit: credit_limit !== undefined ? Number(credit_limit) : undefined,
      cxcAreaId: cxc_area_id !== undefined ? (cxc_area_id ? Number(cxc_area_id) : null) : undefined,
      defaultDiscountPercent: default_discount_percent !== undefined ? Number(default_discount_percent) : undefined,
      isActive: is_active !== undefined ? Number(is_active) : undefined,
    });

    return { ok: true };
  },

  // ─── Categorías por cliente ───
  async getClientCategories(clientId) {
    const parsedId = Number(clientId);
    if (!parsedId) throw new BadRequestError("clientId inválido");
    return cxcRepository.findClientCategories(parsedId);
  },

  async addClientCategory(clientId, { category_id, allow_discount = 1 }) {
    const parsedId = Number(clientId);
    const parsedCatId = Number(category_id);
    if (!parsedId || !parsedCatId) throw new BadRequestError("Categoría requerida");

    await cxcRepository.upsertClientCategory({
      clientId: parsedId,
      categoryId: parsedCatId,
      allowDiscount: Number(allow_discount) ? 1 : 0,
    });

    return { ok: true };
  },

  async deleteClientCategory(clientId, categoryId) {
    const parsedId = Number(clientId);
    const parsedCatId = Number(categoryId);
    if (!parsedId || !parsedCatId) throw new BadRequestError("Identificador inválido");

    await cxcRepository.deleteClientCategory(parsedId, parsedCatId);
    return { ok: true };
  },

  // ─── Descuentos de Categorías ───
  async getCategories(clientId = null) {
    return cxcRepository.findAllCategoriesWithClient(clientId ? Number(clientId) : null);
  },

  async checkDiscount(clientId, productId) {
    if (!clientId || !productId) throw new BadRequestError("client_id y product_id requeridos");
    return cxcRepository.checkDiscountEligibility({
      clientId: Number(clientId),
      productId: Number(productId),
    });
  },

  // ─── Cuentas CXC y Pagos ───
  async createAccount(data) {
    const { client_id, account_id, shift_id, amount, reference = "", notes = "" } = data || {};
    const parsedClientId = Number(client_id);
    const parsedAmount = Number(amount);

    if (!parsedClientId || !parsedAmount || parsedAmount <= 0) {
      throw new BadRequestError("client_id y amount requeridos");
    }

    const client = await cxcRepository.findClientById(parsedClientId);
    if (!client) throw new NotFoundError("Cliente CXC no encontrado");

    const newBalance = Number(client.current_balance || 0) + parsedAmount;
    if (newBalance > Number(client.credit_limit || 0)) {
      throw new BadRequestError("Excede el límite de crédito");
    }

    const id = await cxcRepository.insertCxcAccount({
      clientId: parsedClientId,
      accountId: account_id ? Number(account_id) : null,
      shiftId: shift_id ? Number(shift_id) : null,
      amount: parsedAmount,
      balance: newBalance,
      reference,
      notes,
    });

    await cxcRepository.updateCustomerBalance(parsedClientId, newBalance);

    return { ok: true, id, new_balance: newBalance };
  },

  async addAccountPayment(cxcAccountId, data) {
    const parsedCxcAccountId = Number(cxcAccountId);
    if (!parsedCxcAccountId) throw new BadRequestError("cxcAccountId inválido");

    const { amount, payment_method = "efectivo", reference = "", notes = "" } = data || {};
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) throw new BadRequestError("Monto requerido");

    const cxc = await cxcRepository.findCxcAccountById(parsedCxcAccountId);
    if (!cxc) throw new NotFoundError("Cuenta CXC no encontrada");

    const currentAccBalance = Number(cxc.balance || 0);
    const newBalance = currentAccBalance - parsedAmount;
    const newStatus = newBalance <= 0 ? "paid" : newBalance < currentAccBalance ? "partial" : "pending";

    await cxcRepository.insertCxcPayment({
      cxcAccountId: parsedCxcAccountId,
      amount: parsedAmount,
      paymentMethod: payment_method,
      reference,
      notes,
    });

    await cxcRepository.updateCxcAccountAfterPayment({
      cxcAccountId: parsedCxcAccountId,
      balance: newBalance > 0 ? newBalance : 0,
      status: newStatus,
      paidAt: newStatus === "paid" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
    });

    await cxcRepository.decrementCustomerBalance(cxc.client_id, parsedAmount);

    return { ok: true, new_balance: newBalance, status: newStatus };
  },

  async getAccountById(cxcAccountId) {
    const parsedId = Number(cxcAccountId);
    if (!parsedId) throw new BadRequestError("cxcAccountId inválido");

    const cxc = await cxcRepository.findCxcAccountById(parsedId);
    if (!cxc) throw new NotFoundError("No encontrada");

    const payments = await cxcRepository.findCxcPaymentsByAccountId(parsedId);
    let items = [];
    if (cxc.account_id) {
      items = await cxcRepository.findOrderItemsByAccountId(cxc.account_id);
    }

    return { ...cxc, payments, items };
  },

  async getClientAccounts(clientId) {
    const parsedId = Number(clientId);
    if (!parsedId) throw new BadRequestError("clientId inválido");
    return cxcRepository.findAccountsByClientId(parsedId);
  },

  async getPendingAccounts() {
    return cxcRepository.findPendingAccountsByClient();
  },

  async payGlobal(clientId, data) {
    const parsedClientId = Number(clientId);
    const { amount, payment_method = "efectivo", reference = "", notes = "" } = data || {};
    const parsedAmount = Number(amount);

    if (!parsedClientId || !parsedAmount || parsedAmount <= 0) {
      throw new BadRequestError("clientId y monto requeridos");
    }

    const client = await cxcRepository.findClientById(parsedClientId);
    if (!client) throw new NotFoundError("Cliente no encontrado");

    const accounts = await cxcRepository.findPendingAccountsForClientFIFO(parsedClientId);
    if (!accounts.length) throw new BadRequestError("No hay cuentas pendientes");

    let remaining = parsedAmount;
    const appliedPayments = [];
    const paidAccountIds = [];
    const partialAccountIds = [];

    for (const acc of accounts) {
      if (remaining <= 0) break;

      const accBalance = Number(acc.balance);
      const payAmount = Math.min(remaining, accBalance);
      const newBalance = accBalance - payAmount;
      const newStatus = newBalance <= 0 ? "paid" : "partial";

      await cxcRepository.insertCxcPayment({
        cxcAccountId: acc.id,
        amount: payAmount,
        paymentMethod: payment_method,
        reference,
        notes,
      });

      await cxcRepository.updateCxcAccountAfterPayment({
        cxcAccountId: acc.id,
        balance: newBalance,
        status: newStatus,
        paidAt: newStatus === "paid" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      });

      if (newStatus === "paid") paidAccountIds.push(acc.id);
      else partialAccountIds.push(acc.id);

      appliedPayments.push({ account_id: acc.id, amount: payAmount, new_balance: newBalance, status: newStatus });
      remaining = Number((remaining - payAmount).toFixed(2));
    }

    const totalPaid = Number((parsedAmount - remaining).toFixed(2));
    await cxcRepository.decrementCustomerBalance(parsedClientId, totalPaid);

    return {
      ok: true,
      total_paid: totalPaid,
      remaining,
      applied_payments: appliedPayments,
      paid_accounts: paidAccountIds,
      partial_accounts: partialAccountIds,
      client_balance: Number(client.current_balance) - totalPaid,
    };
  },

  // ─── Estado de cuenta ───
  async getStatement(clientId, { center_id, start_date, end_date, check_number } = {}) {
    const parsedClientId = Number(clientId);
    if (!parsedClientId) throw new BadRequestError("clientId inválido");

    const client = await cxcRepository.findClientById(parsedClientId);
    if (!client) throw new NotFoundError("Cliente no encontrado");

    const centers = await cxcRepository.findClientStatementCenters(parsedClientId);
    const accounts = await cxcRepository.findStatementAccounts({
      clientId: parsedClientId,
      centerId: center_id ? Number(center_id) : null,
      startDate: start_date || null,
      endDate: end_date || null,
      checkNumber: check_number || null,
    });

    const accountIds = accounts.map((a) => a.id);
    const payments = await cxcRepository.findStatementPayments({
      accountIds,
      startDate: start_date || null,
      endDate: end_date || null,
    });

    const movements = [];
    let runningBalance = 0;

    movements.push({
      date: client.created_at,
      type: "initial",
      description: "Saldo inicial",
      charge: 0,
      payment: 0,
      balance: 0,
      center_name: null,
    });

    for (const acc of accounts) {
      runningBalance = Number((runningBalance + Number(acc.amount)).toFixed(2));
      movements.push({
        date: acc.created_at,
        type: "charge",
        description: `Cargo - ${acc.check_number || `#${acc.id}`}${acc.waiter_name ? ` (${acc.waiter_name})` : ""}`,
        charge: Number(acc.amount),
        payment: 0,
        balance: runningBalance,
        center_name: acc.center_name || null,
      });
    }

    for (const pay of payments) {
      runningBalance = Number((runningBalance - Number(pay.amount)).toFixed(2));
      const acc = accounts.find((a) => a.id === pay.account_id);
      movements.push({
        date: pay.created_at,
        type: "payment",
        description: `Pago - ${pay.payment_method}${pay.reference ? ` (Ref: ${pay.reference})` : ""}${acc ? ` - ${acc.check_number || `#${acc.id}`}` : ""}`,
        charge: 0,
        payment: Number(pay.amount),
        balance: runningBalance,
        center_name: acc?.center_name || null,
      });
    }

    return {
      client,
      accounts,
      payments,
      movements,
      centers,
      totals: {
        total_charged: accounts.reduce((s, a) => s + Number(a.amount), 0),
        total_paid: payments.reduce((s, p) => s + Number(p.amount), 0),
        current_balance: Number(client.current_balance),
      },
    };
  },

  async getPendingSummary({ center_id, start_date, end_date } = {}) {
    const rows = await cxcRepository.findPendingSummaryRows({
      centerId: center_id ? Number(center_id) : null,
      startDate: start_date || null,
      endDate: end_date || null,
    });

    const centers = await cxcRepository.findSummaryCenters();
    const summary = rows.map((r) => ({
      ...r,
      balance: Number(r.total_charged) - Number(r.total_paid),
    }));

    return {
      clients: summary,
      centers,
      totals: {
        total_clients: summary.length,
        total_charged: summary.reduce((s, r) => s + Number(r.total_charged), 0),
        total_paid: summary.reduce((s, r) => s + Number(r.total_paid), 0),
        total_balance: summary.reduce((s, r) => s + (Number(r.total_charged) - Number(r.total_paid)), 0),
      },
    };
  },

  // ─── Exportación Excel ───
  async exportStatementToExcel(clientId, filters, user, res) {
    const data = await this.getStatement(clientId, filters);
    const { client, movements, totals } = data;
    const { start_date, end_date } = filters || {};

    const wb = new ExcelJS.Workbook();
    wb.creator = user || "Usuario";
    wb.created = new Date();
    const ws = wb.addWorksheet("Estado de Cuenta");
    ws.pageSetup.orientation = "landscape";
    ws.pageSetup.fitToPage = true;

    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 48;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 16;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;

    let row = 1;
    const logoBuf = getLogoBuffer();
    if (logoBuf) {
      const imgId = wb.addImage({ buffer: logoBuf, extension: "png" });
      ws.addImage(imgId, { tl: { col: 0, row: row - 1 }, ext: { width: 80, height: 60 } });
    }

    ws.mergeCells(row, 1, row + 1, 6);
    ws.getCell(row, 1).value = "ESTADO DE CUENTA";
    ws.getCell(row, 1).font = { bold: true, size: 18, color: { argb: "FF1F4E79" }, name: "Calibri" };
    ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "center" };
    row += 2;

    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = `Cliente: ${client.full_name}${client.area_name ? `  |  ${client.area_name}` : ""}`;
    ws.getCell(row, 1).font = { bold: true, size: 12, name: "Calibri" };
    row++;

    ws.mergeCells(row, 1, row, 6);
    ws.getCell(row, 1).value = `Generado por: ${user}  |  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    ws.getCell(row, 1).font = { italic: true, size: 10, color: { argb: "FF666666" }, name: "Calibri" };
    row++;

    if (start_date || end_date) {
      ws.mergeCells(row, 1, row, 6);
      ws.getCell(row, 1).value = `Período: ${start_date || "—"}  al  ${end_date || "—"}`;
      ws.getCell(row, 1).font = { size: 10, color: { argb: "FF666666" }, name: "Calibri" };
      row++;
    }
    row++;

    // Tarjetas de Resumen
    const summaryData = [
      { label: "Total Cargado", value: totals.total_charged, color: "FF000000" },
      { label: "Total Pagado", value: totals.total_paid, color: "FF008000" },
      { label: "Saldo Actual", value: totals.current_balance, color: totals.current_balance > 0 ? "FFFF0000" : "FF008000" },
      { label: "Límite Crédito", value: Number(client.credit_limit || 0), color: "FF000000" },
    ];

    summaryData.forEach((s, idx) => {
      const c = idx + 2;
      ws.getCell(row, c).value = s.label;
      ws.getCell(row, c).font = { bold: true, size: 9, color: { argb: "FF666666" }, name: "Calibri" };
      ws.getCell(row, c).alignment = { horizontal: "center" };
      ws.getCell(row + 1, c).value = s.value;
      ws.getCell(row + 1, c).numFmt = '"$"#,##0.00';
      ws.getCell(row + 1, c).font = { bold: true, size: 13, color: { argb: s.color }, name: "Calibri" };
      ws.getCell(row + 1, c).alignment = { horizontal: "center" };
      addBorders(ws, row, c, c);
      addBorders(ws, row + 1, c, c);
    });
    row += 3;

    // Tabla de movimientos
    styleHeaderRow(ws, row, 6);
    ["Fecha", "Descripción", "Centro", "Cargo", "Abono", "Saldo"].forEach((h, i) => {
      ws.getCell(row, i + 1).value = h;
    });
    row++;

    movements.forEach((m, idx) => {
      const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFF2F4F7";
      for (let c = 1; c <= 6; c++) {
        ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        ws.getCell(row, c).font = { size: 10, name: "Calibri" };
      }
      ws.getCell(row, 1).value = m.date ? new Date(m.date).toLocaleDateString() : "—";
      ws.getCell(row, 2).value = m.description;
      ws.getCell(row, 3).value = m.center_name || "—";

      ws.getCell(row, 4).value = m.charge || 0;
      ws.getCell(row, 4).numFmt = '"$"#,##0.00';
      ws.getCell(row, 5).value = m.payment || 0;
      ws.getCell(row, 5).numFmt = '"$"#,##0.00';
      ws.getCell(row, 6).value = m.balance;
      ws.getCell(row, 6).numFmt = '"$"#,##0.00';

      addBorders(ws, row, 1, 6);
      row++;
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Estado_Cuenta_${client.full_name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  },

  async exportPendingSummaryToExcel(filters, user, res) {
    const data = await this.getPendingSummary(filters);
    const { clients, totals } = data;
    const { start_date, end_date } = filters || {};

    const wb = new ExcelJS.Workbook();
    wb.creator = user || "Usuario";
    wb.created = new Date();
    const ws = wb.addWorksheet("Saldos Pendientes");
    ws.pageSetup.orientation = "landscape";
    ws.pageSetup.fitToPage = true;

    ws.getColumn(1).width = 30;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 18;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;
    ws.getColumn(7).width = 16;

    let row = 1;
    const logoBuf = getLogoBuffer();
    if (logoBuf) {
      const imgId = wb.addImage({ buffer: logoBuf, extension: "png" });
      ws.addImage(imgId, { tl: { col: 0, row: row - 1 }, ext: { width: 80, height: 60 } });
    }

    ws.mergeCells(row, 1, row + 1, 7);
    ws.getCell(row, 1).value = "REPORTE DE SALDOS PENDIENTES CXC";
    ws.getCell(row, 1).font = { bold: true, size: 18, color: { argb: "FF1F4E79" }, name: "Calibri" };
    ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "center" };
    row += 2;

    ws.mergeCells(row, 1, row, 7);
    ws.getCell(row, 1).value = `Generado por: ${user}  |  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    ws.getCell(row, 1).font = { italic: true, size: 10, color: { argb: "FF666666" }, name: "Calibri" };
    row++;

    if (start_date || end_date) {
      ws.mergeCells(row, 1, row, 7);
      ws.getCell(row, 1).value = `Período: ${start_date || "—"}  al  ${end_date || "—"}`;
      ws.getCell(row, 1).font = { size: 10, color: { argb: "FF666666" }, name: "Calibri" };
      row++;
    }
    row++;

    // Tarjetas
    const summaryCards = [
      { label: "Clientes", value: totals.total_clients, numFmt: "#,##0", color: "FF000000" },
      { label: "Total Cargado", value: totals.total_charged, numFmt: '"$"#,##0.00', color: "FF000000" },
      { label: "Total Pagado", value: totals.total_paid, numFmt: '"$"#,##0.00', color: "FF008000" },
      { label: "Saldo Pendiente Total", value: totals.total_balance, numFmt: '"$"#,##0.00', color: "FFFF0000" },
    ];

    summaryCards.forEach((s, idx) => {
      const c = idx + 2;
      ws.getCell(row, c).value = s.label;
      ws.getCell(row, c).font = { bold: true, size: 9, color: { argb: "FF666666" }, name: "Calibri" };
      ws.getCell(row, c).alignment = { horizontal: "center" };
      ws.getCell(row + 1, c).value = s.value;
      ws.getCell(row + 1, c).numFmt = s.numFmt;
      ws.getCell(row + 1, c).font = { bold: true, size: 13, color: { argb: s.color }, name: "Calibri" };
      ws.getCell(row + 1, c).alignment = { horizontal: "center" };
      addBorders(ws, row, c, c);
      addBorders(ws, row + 1, c, c);
    });
    row += 3;

    // Tabla
    styleHeaderRow(ws, row, 7);
    ["Cliente", "Área", "Teléfono", "Cuentas", "Total Cargado", "Total Pagado", "Saldo Pendiente"].forEach((h, i) => {
      ws.getCell(row, i + 1).value = h;
    });
    row++;

    clients.forEach((c, idx) => {
      const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFF2F4F7";
      for (let col = 1; col <= 7; col++) {
        ws.getCell(row, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        ws.getCell(row, col).font = { size: 10, name: "Calibri" };
      }
      ws.getCell(row, 1).value = c.full_name;
      ws.getCell(row, 2).value = c.area_name || "—";
      ws.getCell(row, 3).value = c.phone || "—";
      ws.getCell(row, 4).value = Number(c.account_count);
      ws.getCell(row, 5).value = Number(c.total_charged);
      ws.getCell(row, 5).numFmt = '"$"#,##0.00';
      ws.getCell(row, 6).value = Number(c.total_paid);
      ws.getCell(row, 6).numFmt = '"$"#,##0.00';
      ws.getCell(row, 7).value = Number(c.balance);
      ws.getCell(row, 7).numFmt = '"$"#,##0.00';
      addBorders(ws, row, 1, 7);
      row++;
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Reporte_Saldos_Pendientes.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  },
};

module.exports = cxcService;
