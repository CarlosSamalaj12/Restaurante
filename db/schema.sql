CREATE DATABASE IF NOT EXISTS restaurant_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_pos;

CREATE TABLE IF NOT EXISTS dining_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  allow_transfer TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  seats INT NOT NULL DEFAULT 4,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_table_area FOREIGN KEY (area_id) REFERENCES dining_areas(id)
);

CREATE TABLE IF NOT EXISTS staff_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('waiter', 'cashier', 'manager', 'admin') NOT NULL DEFAULT 'waiter',
  pin_code VARCHAR(12) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cashier_id INT NOT NULL,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  opening_note VARCHAR(255) NULL,
  closing_note VARCHAR(255) NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  CONSTRAINT fk_shift_cashier FOREIGN KEY (cashier_id) REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  discount_type ENUM('none', 'percent', 'fixed') NOT NULL DEFAULT 'none',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_id INT NOT NULL,
  waiter_id INT NOT NULL,
  shift_id INT NULL,
  customer_id INT NULL,
  status ENUM('open', 'paid', 'void') NOT NULL DEFAULT 'open',
  guest_count INT NOT NULL DEFAULT 1,
  tip_percent_override DECIMAL(5,2) NULL,
  check_number VARCHAR(20) NOT NULL UNIQUE,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  CONSTRAINT fk_account_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
  CONSTRAINT fk_account_waiter FOREIGN KEY (waiter_id) REFERENCES staff_users(id),
  CONSTRAINT fk_account_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  discount_blocked TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  printer_name VARCHAR(120) NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  allow_discount TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES product_categories(id)
);

CREATE TABLE IF NOT EXISTS product_production_centers (
  product_id INT NOT NULL,
  center_id INT NOT NULL,
  PRIMARY KEY (product_id, center_id),
  CONSTRAINT fk_pcenter_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_pcenter_center FOREIGN KEY (center_id) REFERENCES production_centers(id)
);

CREATE TABLE IF NOT EXISTS modifier_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  group_type ENUM('garnish', 'preparation', 'sauce', 'meat_term', 'milk_type', 'beverage_temp', 'ice', 'other') NOT NULL DEFAULT 'other',
  min_select INT NOT NULL DEFAULT 0,
  max_select INT NOT NULL DEFAULT 1,
  is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
  display_method ENUM('buttons', 'radio', 'checkbox') NOT NULL DEFAULT 'buttons',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_modopt_group FOREIGN KEY (group_id) REFERENCES modifier_groups(id)
);

CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id INT NOT NULL,
  group_id INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id),
  CONSTRAINT fk_pmg_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_pmg_group FOREIGN KEY (group_id) REFERENCES modifier_groups(id)
);

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
  created_at DATETIME NOT NULL,
  voided_at DATETIME NULL,
  void_reason VARCHAR(255) NULL,
  void_authorized_by INT NULL,
  CONSTRAINT fk_item_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_item_auth FOREIGN KEY (void_authorized_by) REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  option_id INT NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_oim_item FOREIGN KEY (item_id) REFERENCES order_items(id),
  CONSTRAINT fk_oim_option FOREIGN KEY (option_id) REFERENCES modifier_options(id)
);

CREATE TABLE IF NOT EXISTS account_discounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  type ENUM('percent', 'fixed') NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  reason VARCHAR(120) NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_discount_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_discount_user FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS account_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  method VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_no VARCHAR(50) NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_payment_account FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS account_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  payload LONGTEXT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_event_account FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS folio_charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  account_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_folio_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_folio_account FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(60) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
);

INSERT INTO dining_areas (name) VALUES ('Salon Principal'), ('Terraza');
INSERT INTO staff_users (full_name, role, pin_code) VALUES
('Mesero 1', 'waiter', '1111'),
('Caja 1', 'cashier', '2222'),
('Gerente', 'manager', '9999');

INSERT INTO product_categories (name, sort_order) VALUES
('Platos Fuertes', 1),
('Bebidas Frias', 2),
('Postres', 3),
('Bebidas Calientes', 4);

INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES
('tip_percent', '0');

INSERT INTO production_centers (name, printer_name) VALUES
('Cocina', 'KITCHEN_1'),
('Bar', 'BAR_1');

INSERT INTO products (category_id, name, base_price, allow_discount) VALUES
(1, 'Filete de Pollo a la Plancha', 7.50, 1),
(2, 'Limonada', 2.25, 1),
(3, 'Cheesecake', 3.50, 1),
(4, 'Cafe Latte', 2.75, 1),
(4, 'Cafe Americano', 2.25, 1);

INSERT INTO product_production_centers (product_id, center_id) VALUES
(1, 1),
(2, 2),
(3, 1),
(4, 2),
(5, 2);

INSERT INTO modifier_groups (name, group_type, min_select, max_select, is_mandatory, display_method, sort_order) VALUES
('Guarniciones', 'garnish', 2, 2, 1, 'checkbox', 1),
('Salsas', 'sauce', 0, 2, 0, 'checkbox', 2),
('Metodo de Preparacion', 'preparation', 0, 1, 0, 'radio', 3),
('Tipo de Leche', 'milk_type', 1, 1, 1, 'radio', 1),
('Temperatura', 'beverage_temp', 1, 1, 1, 'radio', 2),
('Hielo', 'ice', 0, 1, 0, 'radio', 3),
('Termino de Carne', 'meat_term', 1, 1, 1, 'radio', 4);

INSERT INTO modifier_options (group_id, name, price_delta, sort_order) VALUES
(1, 'Arroz', 0, 1),
(1, 'Ensalada', 0, 2),
(1, 'Papas Fritas', 0, 3),
(1, 'Papas Horneadas', 0, 4),
(1, 'Vegetales', 0, 5),
(2, 'Chirmol', 0, 1),
(2, 'Guacamole Aparte', 0.75, 2),
(2, 'Salsa Chiltepe', 0.25, 3),
(3, 'Tortilla', 0, 1),
(3, 'Pan', 0, 2),
(4, 'Leche Entera', 0, 1),
(4, 'Leche Deslactosada', 0.25, 2),
(4, 'Leche Almendra', 0.75, 3),
(5, 'Caliente', 0, 1),
(5, 'Frio', 0, 2),
(6, 'Con Hielo', 0, 1),
(6, 'Sin Hielo', 0, 2);

INSERT INTO product_modifier_groups (product_id, group_id, sort_order) VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(4, 4, 1),
(4, 5, 2),
(4, 6, 3),
(5, 5, 1),
(5, 6, 2);

INSERT INTO restaurant_tables (area_id, code, seats) VALUES
(1, 'M1', 4),
(1, 'M2', 4),
(1, 'M3', 6),
(2, 'T1', 4),
(2, 'T2', 4);
