// src/modules/expenses/expenses.migration.js
// Migración y aseguramiento de tablas para Gastos, Proveedores y Cuentas por Pagar (CXP)

const fs = require("fs");
const path = require("path");
const { query, safeExec } = require("../../common/db");

const DEFAULT_CATEGORIES = [
  { name: "Alimentos e Insumos", description: "Carnes, verduras, abarrotes y materia prima de cocina", color: "#10b981" },
  { name: "Bebidas y Licores", description: "Refrescos, cervezas, licores y cristalería de bar", color: "#06b6d4" },
  { name: "Servicios Básicos", description: "Luz eléctrica, agua potable, gas propano e internet", color: "#f59e0b" },
  { name: "Sueldos y Nómina", description: "Salarios, anticipos, propinas y prestaciones", color: "#8b5cf6" },
  { name: "Alquiler y Arrendamiento", description: "Renta de local comercial y espacios", color: "#ec4899" },
  { name: "Mantenimiento y Reparaciones", description: "Reparación de equipos, plomería, pintura y refrigeración", color: "#f97316" },
  { name: "Empaques y Desechables", description: "Bolsas, cajas para llevar, servilletas y vasos desechables", color: "#84cc16" },
  { name: "Publicidad y Marketing", description: "Redes sociales, volantes, promociones y diseño", color: "#3b82f6" },
  { name: "Limpieza y Desinfección", description: "Detergentes, cloro, desinfectantes y útiles de aseo", color: "#14b8a6" },
  { name: "Impuestos y Licencias", description: "Pagos a SAT, permisos sanitarios y municipales", color: "#64748b" },
  { name: "Otros Gastos Operativos", description: "Gastos imprevistos y otros egresos de operación", color: "#6b7280" },
];

async function ensureExpensesTables() {
  // Asegurar directorio para comprobantes/facturas
  const vouchersDir = path.join(process.cwd(), "public", "uploads", "vouchers");
  if (!fs.existsSync(vouchersDir)) {
    fs.mkdirSync(vouchersDir, { recursive: true });
  }

  // 1. Tabla de Categorías de Gastos
  await query(
    `CREATE TABLE IF NOT EXISTS expense_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      color VARCHAR(20) NOT NULL DEFAULT '#64748b',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // Precargar categorías predeterminadas
  for (const cat of DEFAULT_CATEGORIES) {
    await query(
      `INSERT INTO expense_categories (name, description, color, is_active)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE description = VALUES(description), color = VALUES(color)`,
      [cat.name, cat.description, cat.color]
    );
  }

  // 2. Tabla de Proveedores (Suppliers / CXP)
  await query(
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      tax_id VARCHAR(50) NULL,
      contact_name VARCHAR(100) NULL,
      phone VARCHAR(50) NULL,
      email VARCHAR(100) NULL,
      address VARCHAR(255) NULL,
      credit_days INT NOT NULL DEFAULT 0,
      notes TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_supplier_name (name),
      INDEX idx_supplier_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 3. Tabla Principal de Gastos (Expenses)
  await query(
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      expense_date DATE NOT NULL,
      category_id INT NOT NULL,
      supplier_id INT NULL,
      description VARCHAR(255) NOT NULL,
      document_number VARCHAR(100) NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method ENUM('efectivo', 'tarjeta', 'transferencia', 'por_pagar') NOT NULL DEFAULT 'efectivo',
      status ENUM('paid', 'pending', 'partial', 'cancelled') NOT NULL DEFAULT 'paid',
      paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      affects_shift_cash TINYINT(1) NOT NULL DEFAULT 0,
      shift_id INT NULL,
      shift_expense_id INT NULL,
      voucher_url VARCHAR(255) NULL,
      notes TEXT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_expense_date (expense_date),
      INDEX idx_expense_category (category_id),
      INDEX idx_expense_supplier (supplier_id),
      INDEX idx_expense_status (status),
      INDEX idx_expense_payment_method (payment_method),
      INDEX idx_expense_shift (shift_id),
      INDEX idx_expense_created_by (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // 4. Tabla de Abonos y Pagos a Proveedores (Supplier Payments)
  await query(
    `CREATE TABLE IF NOT EXISTS supplier_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      expense_id INT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method ENUM('efectivo', 'tarjeta', 'transferencia') NOT NULL DEFAULT 'efectivo',
      payment_date DATE NOT NULL,
      reference_number VARCHAR(100) NULL,
      voucher_url VARCHAR(255) NULL,
      notes TEXT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pay_supplier (supplier_id),
      INDEX idx_pay_expense (expense_id),
      INDEX idx_pay_date (payment_date),
      INDEX idx_pay_created_by (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  console.log("[MIGRATION] Tablas del módulo de Gastos y Proveedores (CXP) aseguradas OK");
}

module.exports = {
  ensureExpensesTables,
};
