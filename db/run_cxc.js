const mysql = require("mysql2/promise");

async function executeSQL() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "pos_user",
    password: "Xvfv2du1p5xyZX",
    database: "restaurant_pos",
    multipleStatements: true
  });

  const sql = `
-- =============================================
-- CXC - Cuentas por Cobrar
-- =============================================

-- 1. Áreas/Instituciones (Empresas, Clubes, etc.)
CREATE TABLE IF NOT EXISTS cxc_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Extender customers para CXC
ALTER TABLE customers ADD COLUMN cxc_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN current_balance DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN cxc_area_id INT NULL;
ALTER TABLE customers ADD COLUMN default_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

-- FK para área CXC
ALTER TABLE customers ADD CONSTRAINT fk_customer_cxc_area FOREIGN KEY (cxc_area_id) REFERENCES cxc_areas(id);

-- 3. Categorías permitidas para descuento por cliente CXC
CREATE TABLE IF NOT EXISTS cxc_client_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  category_id INT NOT NULL,
  allow_discount TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cxc_client FOREIGN KEY (client_id) REFERENCES customers(id),
  CONSTRAINT fk_cxc_category FOREIGN KEY (category_id) REFERENCES product_categories(id),
  UNIQUE KEY unique_client_category (client_id, category_id)
);

-- 4. Cuentas CXC (movimientos de cuenta por cobrar)
CREATE TABLE IF NOT EXISTS cxc_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  account_id INT NULL,
  shift_id INT NULL,
  payment_method_code VARCHAR(30) NOT NULL DEFAULT 'CXC',
  amount DECIMAL(12,2) NOT NULL,
  balance DECIMAL(12,2) NOT NULL,
  reference VARCHAR(120) NULL,
  notes VARCHAR(255) NULL,
  status ENUM('pending', 'partial', 'paid', 'void') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  CONSTRAINT fk_cxc_client_account FOREIGN KEY (client_id) REFERENCES customers(id),
  CONSTRAINT fk_cxc_restaurant_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_cxc_shift FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- 5. Pagos a cuenta CXC
CREATE TABLE IF NOT EXISTS cxc_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cxc_account_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  reference VARCHAR(120) NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cxc_payment_account FOREIGN KEY (cxc_account_id) REFERENCES cxc_accounts(id)
);

-- 6. Índices para mejor rendimiento
CREATE INDEX idx_cxc_client ON cxc_accounts(client_id);
CREATE INDEX idx_cxc_account ON cxc_accounts(account_id);
CREATE INDEX idx_cxc_status ON cxc_accounts(status);
CREATE INDEX idx_cxc_client_categories ON cxc_client_categories(client_id);

-- =============================================
-- Datos de ejemplo (opcional)
-- =============================================

-- Áreas de ejemplo
INSERT INTO cxc_areas (name) VALUES
('Club Social'),
('Hotel'),
('Empresa'),
('Colegio');
`;

  try {
    await connection.query(sql);
    console.log("✅ Tablas CXC creadas exitosamente!");
    
    // Verificar que se crearon
    const [tables] = await connection.query("SHOW TABLES LIKE 'cxc%'");
    console.log("Tablas creadas:", tables.map(t => Object.values(t)[0]).join(", "));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await connection.end();
  }
}

executeSQL();