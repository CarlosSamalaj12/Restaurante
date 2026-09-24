-- ============================================================================
-- SAMA POS - SCHEMA COMPLETO DE BASE DE DATOS
-- Sistema de Punto de Venta, KDS, Inventarios, CXC y Licenciamiento
-- Base de datos: restaurant_pos
-- ============================================================================

CREATE DATABASE IF NOT EXISTS restaurant_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_pos;

-- ----------------------------------------------------------------------------
-- 1. CONFIGURACIÓN Y PERFIL DE NEGOCIO
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS business_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_name VARCHAR(150) NOT NULL DEFAULT 'Mi Restaurante',
  logo_url TEXT NULL,
  login_bg_url TEXT NULL,
  phone VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  tax_id VARCHAR(50) NULL,
  currency_symbol VARCHAR(10) NOT NULL DEFAULT 'Q',
  tip_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  receipt_footer TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(60) PRIMARY KEY,
  setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 2. CENTROS DE OPERACIÓN (SUCURSALES / ÁREAS OPERATIVAS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS operation_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 3. SALONES Y MESAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dining_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  allow_transfer TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  operation_center_id INT NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  seats INT NOT NULL DEFAULT 4,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_table_area FOREIGN KEY (area_id) REFERENCES dining_areas(id),
  CONSTRAINT fk_table_center FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 4. USUARIOS, ROLES Y PERMISOS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('waiter', 'cashier', 'manager', 'admin') NOT NULL DEFAULT 'waiter',
  pin_code VARCHAR(12) NULL,
  operation_center_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_operation_center FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(40) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  module_code VARCHAR(30) NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_modules (
  code VARCHAR(30) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_module_permissions (
  user_id INT NOT NULL,
  module_code VARCHAR(30) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, module_code),
  CONSTRAINT fk_user_module_user FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_module_code FOREIGN KEY (module_code) REFERENCES app_modules(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS terminal_module_bindings (
  ip_address VARCHAR(64) NOT NULL,
  module_code VARCHAR(30) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_address, module_code),
  CONSTRAINT fk_terminal_module_code FOREIGN KEY (module_code) REFERENCES app_modules(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS terminal_center_bindings (
  ip_address VARCHAR(64) PRIMARY KEY,
  center_id INT NOT NULL,
  label VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_tcb_center FOREIGN KEY (center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS terminals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operation_center_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  printer_name VARCHAR(120) NULL,
  printer_ip VARCHAR(45) NULL,
  printer_port INT DEFAULT 9100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_terminal_center FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  role VARCHAR(40) NOT NULL,
  permissions_json JSON NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  INDEX idx_user (user_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 5. IMPRESIONES Y AUDITORÍA DE TRABAJOS DE IMPRESIÓN
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS print_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  printer_target VARCHAR(120) NOT NULL,
  printer_ip VARCHAR(45) NULL,
  printer_port INT NULL,
  job_type ENUM('kitchen_ticket','customer_receipt','test') NOT NULL,
  account_id INT NULL,
  payload_size INT NULL,
  status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_print_status (status),
  INDEX idx_print_account (account_id),
  INDEX idx_print_created (created_at),
  INDEX idx_print_target (printer_target, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 6. TURNOS (SHIFTS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cashier_id INT NOT NULL,
  operation_center_id INT NULL,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash DECIMAL(10,2) NULL,
  opening_note VARCHAR(255) NULL,
  closing_note VARCHAR(255) NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  CONSTRAINT fk_shift_cashier FOREIGN KEY (cashier_id) REFERENCES staff_users(id),
  CONSTRAINT fk_shift_center FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 7. CLIENTES Y CUENTAS POR COBRAR (CXC)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cxc_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  discount_type ENUM('none', 'percent', 'fixed') NOT NULL DEFAULT 'none',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  cxc_enabled TINYINT(1) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  cxc_area_id INT NULL,
  default_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_cxc_area FOREIGN KEY (cxc_area_id) REFERENCES cxc_areas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 8. PRODUCTOS, CATEGORÍAS Y CENTROS DE PRODUCCIÓN
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(30) NULL,
  operation_center_id INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  discount_blocked TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_pcat_center FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS production_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  printer_name VARCHAR(120) NULL,
  printer_ip VARCHAR(45) NULL,
  printer_port INT NOT NULL DEFAULT 9100,
  operation_center_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_pcenter_opcenter FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  operation_center_id INT NULL,
  name VARCHAR(120) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  allow_discount TINYINT(1) NOT NULL DEFAULT 1,
  track_inventory TINYINT(1) NOT NULL DEFAULT 0,
  color VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES product_categories(id),
  CONSTRAINT fk_product_opcenter FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_production_centers (
  product_id INT NOT NULL,
  center_id INT NOT NULL,
  PRIMARY KEY (product_id, center_id),
  CONSTRAINT fk_pcenter_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcenter_center FOREIGN KEY (center_id) REFERENCES production_centers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS operation_center_products (
  center_id INT NOT NULL,
  product_id INT NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (center_id, product_id),
  CONSTRAINT fk_ocp_center FOREIGN KEY (center_id) REFERENCES operation_centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ocp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cxc_client_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  category_id INT NOT NULL,
  allow_discount TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cxc_client FOREIGN KEY (client_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cxc_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE,
  UNIQUE KEY unique_client_category (client_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 9. MODIFICADORES Y OPCIONES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS modifier_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  group_type VARCHAR(50) NOT NULL DEFAULT 'multiple',
  min_select INT NOT NULL DEFAULT 0,
  max_select INT NOT NULL DEFAULT 1,
  is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
  display_method ENUM('buttons', 'radio', 'checkbox') NOT NULL DEFAULT 'buttons',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS modifier_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_modopt_group FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id INT NOT NULL,
  group_id INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id),
  CONSTRAINT fk_pmg_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pmg_group FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 10. RECETAS E INVENTARIO
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'pz',
  current_stock DECIMAL(12,4) NOT NULL DEFAULT 0,
  min_stock DECIMAL(12,4) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  inventory_item_id INT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  CONSTRAINT fk_recipe_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_item_id INT NOT NULL,
  type ENUM('entry', 'exit', 'adjustment') NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id INT NULL,
  note TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_user FOREIGN KEY (created_by) REFERENCES staff_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 11. MÉTODOS DE PAGO Y DESCUENTOS PRECONFIGURADOS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_methods (
  code VARCHAR(30) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  applies_tip TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS discount_presets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  type ENUM('percent', 'fixed') NOT NULL,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 12. CUENTAS, ÓRDENES Y TRANSACCIONES DEL POS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_id INT NOT NULL,
  operation_center_id INT NOT NULL,
  waiter_id INT NOT NULL,
  shift_id INT NULL,
  customer_id INT NULL,
  status ENUM('open', 'paid', 'void') NOT NULL DEFAULT 'open',
  merged_into_account_id INT NULL,
  guest_count INT NOT NULL DEFAULT 1,
  tip_percent_override DECIMAL(5,2) NULL,
  check_number VARCHAR(20) NOT NULL UNIQUE,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  CONSTRAINT fk_account_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
  CONSTRAINT fk_account_center FOREIGN KEY (operation_center_id) REFERENCES operation_centers(id),
  CONSTRAINT fk_account_waiter FOREIGN KEY (waiter_id) REFERENCES staff_users(id),
  CONSTRAINT fk_account_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  product_id INT NOT NULL,
  seat_no INT NOT NULL DEFAULT 1,
  qty DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  notes VARCHAR(255) NULL,
  status ENUM('active', 'void') NOT NULL DEFAULT 'active',
  sent_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  voided_at DATETIME NULL,
  void_reason VARCHAR(255) NULL,
  void_authorized_by INT NULL,
  CONSTRAINT fk_item_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_item_auth FOREIGN KEY (void_authorized_by) REFERENCES staff_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  option_id INT NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_oim_item FOREIGN KEY (item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_oim_option FOREIGN KEY (option_id) REFERENCES modifier_options(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS account_discounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  type ENUM('percent', 'fixed') NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  reason VARCHAR(120) NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_discount_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_discount_user FOREIGN KEY (created_by) REFERENCES staff_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS account_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_no VARCHAR(50) NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_payment_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS account_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  payload LONGTEXT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_event_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 13. MOVIMIENTOS Y PAGOS DE CUENTAS POR COBRAR (CXC)
-- ----------------------------------------------------------------------------

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cxc_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cxc_account_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  reference VARCHAR(120) NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cxc_payment_account FOREIGN KEY (cxc_account_id) REFERENCES cxc_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS folio_charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  account_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_folio_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_folio_account FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 14. LICENCIAMIENTO Y TERMINALES AUTORIZADAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS licenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tier ENUM('trial','standard') NOT NULL DEFAULT 'trial',
  max_terminals INT NOT NULL DEFAULT 2,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NULL,
  offline_grace_days INT NOT NULL DEFAULT 7,
  status ENUM('active','expired','revoked') NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS licensed_terminals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  license_id INT NULL,
  serial VARCHAR(128) NOT NULL UNIQUE,
  hostname VARCHAR(255),
  ip_address VARCHAR(45),
  os_info VARCHAR(255),
  terminal_type ENUM('pos','kds') NOT NULL DEFAULT 'pos',
  label VARCHAR(255),
  status ENUM('pending','active','revoked','replaced') NOT NULL DEFAULT 'pending',
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NULL,
  last_online_at DATETIME NULL,
  approved_at DATETIME NULL,
  approved_by_user_id INT NULL,
  INDEX idx_status (status),
  INDEX idx_serial (serial),
  CONSTRAINT fk_lt_license FOREIGN KEY (license_id) REFERENCES licenses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS license_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  actor_user_id INT NULL,
  terminal_id INT NULL,
  license_id INT NULL,
  action VARCHAR(50) NOT NULL,
  details JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- 15. SEED DATA INICIAL
-- ----------------------------------------------------------------------------

INSERT INTO operation_centers (name, is_active) VALUES ('Centro Principal', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO dining_areas (name, sort_order) VALUES ('Salón Principal', 1), ('Terraza', 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO restaurant_tables (area_id, operation_center_id, code, seats) VALUES
(1, 1, 'M1', 4),
(1, 1, 'M2', 4),
(1, 1, 'M3', 6),
(2, 1, 'T1', 4),
(2, 1, 'T2', 4)
ON DUPLICATE KEY UPDATE seats = VALUES(seats);

INSERT INTO staff_users (full_name, role, pin_code, operation_center_id) VALUES
('Mesero 1', 'waiter', '1111', 1),
('Caja 1', 'cashier', '2222', 1),
('Administrador', 'admin', '1203', 1)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO app_modules (code, label, is_active, sort_order) VALUES
('restaurant', 'Módulo Restaurante', 1, 1),
('pms', 'Módulo PMS', 1, 2),
('crm', 'Módulo CRM', 1, 3),
('erp', 'Módulo ERP', 1, 4)
ON DUPLICATE KEY UPDATE label = VALUES(label), is_active = VALUES(is_active);

INSERT INTO payment_methods (code, label, is_active, sort_order, applies_tip) VALUES
('cash', 'Efectivo', 1, 1, 1),
('card', 'Tarjeta', 1, 2, 1),
('transfer', 'Transferencia', 1, 3, 1),
('cxc', 'Cuentas por Cobrar', 1, 4, 0),
('credit_folio', 'Folio (CxC)', 1, 5, 1),
('other', 'Otro', 1, 6, 1)
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO production_centers (name, printer_name, printer_ip, printer_port, operation_center_id) VALUES
('Cocina', 'KITCHEN_1', NULL, 9100, 1),
('Bar', 'BAR_1', NULL, 9100, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO product_categories (name, sort_order) VALUES
('Platos Fuertes', 1),
('Bebidas Frías', 2),
('Postres', 3),
('Bebidas Calientes', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO business_profile (id, restaurant_name, currency_symbol, tip_percent, receipt_footer)
VALUES (1, 'Mi Restaurante', 'Q', 10.00, '¡Gracias por su visita!')
ON DUPLICATE KEY UPDATE restaurant_name = VALUES(restaurant_name);
