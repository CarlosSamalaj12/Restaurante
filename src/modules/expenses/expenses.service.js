// src/modules/expenses/expenses.service.js
// Lógica de negocio para Gastos, Proveedores, Cuentas por Pagar (CXP) y Balance

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const expensesRepository = require("./expenses.repository");
const shiftsRepository = require("../shifts/shifts.repository");
const { withTransaction, query } = require("../../common/db");
const { BadRequestError, NotFoundError } = require("../../common/errors");
const { money, nowSql } = require("../../common/utils");

const expensesService = {
  // ==========================================
  // GASTOS (EXPENSES)
  // ==========================================

  async getExpenses(filters) {
    const list = await expensesRepository.getExpenses(filters);
    const kpis = await expensesRepository.getExpensesKpis(filters);
    return {
      expenses: list,
      kpis,
    };
  },

  async getExpenseById(id) {
    const expense = await expensesRepository.findExpenseById(id);
    if (!expense) throw new NotFoundError("Gasto no encontrado");
    return expense;
  },

  async createExpense(data, user) {
    const {
      expenseDate,
      categoryId,
      supplierId,
      description,
      documentNumber,
      amount,
      paymentMethod = "efectivo",
      affectsShiftCash = false,
      voucherUrl,
      notes,
    } = data;

    if (!expenseDate) throw new BadRequestError("La fecha del gasto es obligatoria");
    if (!categoryId) throw new BadRequestError("La categoría es obligatoria");
    if (!description || !description.trim()) throw new BadRequestError("La descripción o concepto es obligatorio");
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw new BadRequestError("El monto debe ser mayor a 0");

    const category = await expensesRepository.findCategoryById(categoryId);
    if (!category) throw new BadRequestError("La categoría especificada no existe");

    let shiftId = null;
    let shiftExpenseId = null;
    const isCredit = paymentMethod === "por_pagar";
    const status = isCredit ? "pending" : "paid";
    const paidAmount = isCredit ? 0 : numAmount;

    return await withTransaction(async (conn) => {
      // Si el gasto se pagó en efectivo y se marcó afectar caja chica
      if (!isCredit && paymentMethod === "efectivo" && affectsShiftCash) {
        // Buscar si hay turno abierto
        const [activeShifts] = await query(
          `SELECT id, status FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1`,
          [],
          conn
        );
        if (activeShifts && activeShifts.length > 0) {
          shiftId = activeShifts[0].id;
          const [insShiftExp] = await query(
            `INSERT INTO shift_expenses (shift_id, amount, reason, authorized_by, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              shiftId,
              money(numAmount),
              `[Gasto] ${description.trim()}`,
              user?.id ? Number(user.id) : null,
              nowSql(),
            ],
            conn
          );
          shiftExpenseId = insShiftExp.insertId;
        }
      }

      const expenseId = await expensesRepository.insertExpense(
        {
          expenseDate,
          categoryId,
          supplierId: supplierId || null,
          description: description.trim(),
          documentNumber: documentNumber ? documentNumber.trim() : null,
          amount: numAmount,
          paymentMethod,
          status,
          paidAmount,
          affectsShiftCash: Boolean(shiftExpenseId),
          shiftId,
          shiftExpenseId,
          voucherUrl: voucherUrl || null,
          notes: notes ? notes.trim() : null,
          createdBy: user?.id || 1,
        },
        conn
      );

      return await expensesRepository.findExpenseById(expenseId, conn);
    });
  },

  async updateExpense(id, data, user) {
    const existing = await expensesRepository.findExpenseById(id);
    if (!existing) throw new NotFoundError("Gasto no encontrado");

    return await withTransaction(async (conn) => {
      await expensesRepository.updateExpense(id, data, conn);
      return await expensesRepository.findExpenseById(id, conn);
    });
  },

  async deleteExpense(id) {
    const existing = await expensesRepository.findExpenseById(id);
    if (!existing) throw new NotFoundError("Gasto no encontrado");

    return await withTransaction(async (conn) => {
      // Si afectó caja chica y el turno sigue abierto, remover el registro de caja chica
      if (existing.shift_expense_id) {
        await query(`DELETE FROM shift_expenses WHERE id = ?`, [existing.shift_expense_id], conn);
      }

      // Eliminar abonos vinculados a esta factura
      await query(`DELETE FROM supplier_payments WHERE expense_id = ?`, [Number(id)], conn);

      // Eliminar el gasto
      await expensesRepository.deleteExpense(id, conn);
      return { success: true };
    });
  },

  // ==========================================
  // CARGA DE VOUCHERS / FACTURAS (IMÁGENES)
  // ==========================================

  async uploadVoucher(fileData) {
    const { base64, fileName = "voucher.jpg" } = fileData;
    if (!base64) throw new BadRequestError("No se proporcionó archivo base64");

    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const dataString = matches ? matches[2] : base64;
    const buffer = Buffer.from(dataString, "base64");

    let ext = "";
    if (matches && matches[1]) {
      const mime = matches[1].toLowerCase();
      if (mime.includes("png")) ext = "png";
      else if (mime.includes("webp")) ext = "webp";
      else if (mime.includes("pdf")) ext = "pdf";
      else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
      else {
        throw new BadRequestError("Formato de comprobante no permitido. Solo se aceptan JPG, PNG, WEBP o PDF.");
      }
    } else {
      const extMatch = fileName.match(/\.([0-9a-z]+)$/i);
      if (extMatch) ext = extMatch[1].toLowerCase();
    }

    const allowedExts = ["jpg", "jpeg", "png", "webp", "pdf"];
    if (!ext || !allowedExts.includes(ext.toLowerCase())) {
      throw new BadRequestError("Formato de comprobante no permitido. Solo se aceptan JPG, PNG, WEBP o PDF.");
    }

    const uniqueName = `voucher_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "vouchers");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    return {
      url: `/uploads/vouchers/${uniqueName}`,
      fileName: uniqueName,
    };
  },

  // ==========================================
  // CATEGORÍAS (CATEGORIES)
  // ==========================================

  async getCategories(options) {
    return await expensesRepository.getCategories(options);
  },

  async createCategory({ name, description, color }) {
    if (!name || !name.trim()) throw new BadRequestError("El nombre de la categoría es obligatorio");
    const id = await expensesRepository.insertCategory({ name, description, color });
    return await expensesRepository.findCategoryById(id);
  },

  async updateCategory(id, data) {
    const existing = await expensesRepository.findCategoryById(id);
    if (!existing) throw new NotFoundError("Categoría no encontrada");
    await expensesRepository.updateCategory(id, data);
    return await expensesRepository.findCategoryById(id);
  },

  async deleteCategory(id) {
    const existing = await expensesRepository.findCategoryById(id);
    if (!existing) throw new NotFoundError("Categoría no encontrada");
    await expensesRepository.deleteCategory(id);
    return { success: true };
  },

  // ==========================================
  // PROVEEDORES & CUENTAS POR PAGAR (SUPPLIERS)
  // ==========================================

  async getSuppliers(filters) {
    return await expensesRepository.getSuppliers(filters);
  },

  async getSupplierById(id) {
    const supplier = await expensesRepository.findSupplierById(id);
    if (!supplier) throw new NotFoundError("Proveedor no encontrado");
    return supplier;
  },

  async createSupplier(data) {
    if (!data.name || !data.name.trim()) throw new BadRequestError("El nombre del proveedor es obligatorio");
    const id = await expensesRepository.insertSupplier(data);
    return await expensesRepository.findSupplierById(id);
  },

  async updateSupplier(id, data) {
    const existing = await expensesRepository.findSupplierById(id);
    if (!existing) throw new NotFoundError("Proveedor no encontrado");
    await expensesRepository.updateSupplier(id, data);
    return await expensesRepository.findSupplierById(id);
  },

  async deleteSupplier(id) {
    const existing = await expensesRepository.findSupplierById(id);
    if (!existing) throw new NotFoundError("Proveedor no encontrado");
    await expensesRepository.deleteSupplier(id);
    return { success: true };
  },

  async getSupplierStatement(supplierId) {
    const supplier = await expensesRepository.findSupplierById(supplierId);
    if (!supplier) throw new NotFoundError("Proveedor no encontrado");

    const bills = await expensesRepository.getSupplierBills(supplierId);
    const payments = await expensesRepository.getSupplierPayments(supplierId);

    const totalCreditInvoiced = bills
      .filter((b) => b.payment_method === "por_pagar")
      .reduce((acc, b) => acc + Number(b.amount || 0), 0);

    const totalPaid = bills
      .filter((b) => b.payment_method === "por_pagar")
      .reduce((acc, b) => acc + Number(b.paid_amount || 0), 0);

    const pendingDebt = Math.max(0, totalCreditInvoiced - totalPaid);

    return {
      supplier,
      bills,
      payments,
      summary: {
        totalCreditInvoiced: money(totalCreditInvoiced),
        totalPaid: money(totalPaid),
        pendingDebt: money(pendingDebt),
        pendingBillsCount: bills.filter((b) => b.payment_method === "por_pagar" && b.status !== "paid").length,
      },
    };
  },

  async registerSupplierPayment(supplierId, paymentData, user) {
    const parsedSupplierId = Number(supplierId);
    if (!parsedSupplierId) throw new BadRequestError("ID de proveedor inválido");

    const {
      amount,
      paymentMethod = "efectivo",
      paymentDate,
      referenceNumber,
      voucherUrl,
      notes,
      expenseId = null,
    } = paymentData;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestError("El monto del abono debe ser mayor a 0");
    }

    const supplier = await expensesRepository.findSupplierById(parsedSupplierId);
    if (!supplier) throw new NotFoundError("Proveedor no encontrado");

    return await withTransaction(async (conn) => {
      let remainingToApply = numAmount;

      if (expenseId) {
        // Abono a factura / gasto específico
        const expense = await expensesRepository.findExpenseById(expenseId, conn);
        if (!expense) throw new NotFoundError("Gasto/factura no encontrado");
        if (Number(expense.supplier_id) !== parsedSupplierId) {
          throw new BadRequestError("La factura no corresponde a este proveedor");
        }

        const currentPaid = Number(expense.paid_amount || 0);
        const expAmount = Number(expense.amount || 0);
        const newPaid = money(currentPaid + numAmount);
        const newStatus = newPaid >= expAmount ? "paid" : "partial";

        await expensesRepository.updateExpense(
          expenseId,
          {
            paidAmount: newPaid,
            status: newStatus,
          },
          conn
        );
      } else {
        // Abono global: aplicar a facturas pendientes en orden cronológico
        const [pendingBills] = await query(
          `SELECT id, amount, paid_amount, status
           FROM expenses
           WHERE supplier_id = ? AND payment_method = 'por_pagar' AND status IN ('pending', 'partial')
           ORDER BY expense_date ASC, id ASC`,
          [parsedSupplierId],
          conn
        );

        for (const bill of pendingBills) {
          if (remainingToApply <= 0) break;

          const billTotal = Number(bill.amount || 0);
          const billPaid = Number(bill.paid_amount || 0);
          const billRemaining = money(billTotal - billPaid);

          const applyToThis = Math.min(remainingToApply, billRemaining);
          const newBillPaid = money(billPaid + applyToThis);
          const newStatus = newBillPaid >= billTotal ? "paid" : "partial";

          await expensesRepository.updateExpense(
            bill.id,
            {
              paidAmount: newBillPaid,
              status: newStatus,
            },
            conn
          );

          remainingToApply = money(remainingToApply - applyToThis);
        }
      }

      // Registrar en la tabla de abonos/pagos a proveedores
      const paymentId = await expensesRepository.insertSupplierPayment(
        {
          supplierId: parsedSupplierId,
          expenseId: expenseId ? Number(expenseId) : null,
          amount: numAmount,
          paymentMethod,
          paymentDate: paymentDate || nowSql().split(" ")[0],
          referenceNumber,
          voucherUrl,
          notes,
          createdBy: user?.id || 1,
        },
        conn
      );

      return {
        paymentId,
        amount: numAmount,
        applied: true,
      };
    });
  },

  // ==========================================
  // BALANCE Y GANANCIAS (PROFIT & LOSS)
  // ==========================================

  async getFinancialSummary(filters) {
    return await expensesRepository.getFinancialSummary(filters);
  },
};

module.exports = expensesService;
