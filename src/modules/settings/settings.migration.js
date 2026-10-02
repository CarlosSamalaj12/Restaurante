// src/modules/settings/settings.migration.js
// Migración y aseguramiento de tablas base de configuración

const { query, safeExec } = require("../../common/db");

const PAYMENT_METHOD_DEFAULTS = [
  { code: "cash", label: "Efectivo" },
  { code: "card", label: "Tarjeta" },
  { code: "transfer", label: "Transferencia" },
  { code: "cxc", label: "Cuentas por Cobrar" },
  { code: "credit_folio", label: "Crédito Folio" },
  { code: "other", label: "Otros" },
];

const MODULE_DEFAULTS = [
  { code: "restaurant", label: "Restaurante", sortOrder: 1 },
  { code: "erp", label: "ERP", sortOrder: 2 },
  { code: "crm", label: "CRM", sortOrder: 3 },
  { code: "pms", label: "PMS", sortOrder: 4 },
];

async function ensureConfigTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS payment_methods (
      code VARCHAR(30) PRIMARY KEY,
      label VARCHAR(80) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      applies_tip TINYINT(1) NOT NULL DEFAULT 1
    )`
  );
  await safeExec(`ALTER TABLE payment_methods ADD COLUMN applies_tip TINYINT(1) NOT NULL DEFAULT 1`);

  for (let i = 0; i < PAYMENT_METHOD_DEFAULTS.length; i += 1) {
    const item = PAYMENT_METHOD_DEFAULTS[i];
    const defaultAppliesTip = item.code === "cxc" ? 0 : 1;
    await query(
      `INSERT INTO payment_methods (code, label, is_active, sort_order, applies_tip)
       VALUES (?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label)`,
      [item.code, item.label, i + 1, defaultAppliesTip]
    );
  }

  await query(
    `CREATE TABLE IF NOT EXISTS discount_presets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      type ENUM('percent', 'fixed') NOT NULL,
      value DECIMAL(10,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS operation_centers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS operation_center_products (
      center_id INT NOT NULL,
      product_id INT NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (center_id, product_id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS terminal_center_bindings (
      ip_address VARCHAR(64) PRIMARY KEY,
      center_id INT NOT NULL,
      label VARCHAR(120) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(60) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS app_modules (
      code VARCHAR(30) PRIMARY KEY,
      label VARCHAR(80) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS user_module_permissions (
      user_id INT NOT NULL,
      module_code VARCHAR(30) NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, module_code)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS terminal_module_bindings (
      ip_address VARCHAR(64) NOT NULL,
      module_code VARCHAR(30) NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (ip_address, module_code)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS kitchen_quick_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      label VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'General',
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active_sort (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  const [existingKitchenNotes] = await query(`SELECT id FROM kitchen_quick_notes LIMIT 1`);
  if (!existingKitchenNotes || !existingKitchenNotes.length) {
    const defaultNotes = [
      { label: "Sin cebolla", category: "Ingredientes", sort_order: 1 },
      { label: "Salsa aparte", category: "Servicio", sort_order: 2 },
      { label: "Término medio", category: "Cocción", sort_order: 3 },
      { label: "Bien cocido", category: "Cocción", sort_order: 4 },
      { label: "Sin picante", category: "Ingredientes", sort_order: 5 },
      { label: "Para llevar", category: "Empaque", sort_order: 6 },
      { label: "Bien caliente", category: "Servicio", sort_order: 7 },
      { label: "Sin sal", category: "Ingredientes", sort_order: 8 },
    ];
    for (const note of defaultNotes) {
      await query(
        `INSERT INTO kitchen_quick_notes (label, category, sort_order, is_active) VALUES (?, ?, ?, 1)`,
        [note.label, note.category, note.sort_order]
      );
    }
  }

  await safeExec(
    `ALTER TABLE order_items ADD COLUMN completed_at DATETIME NULL AFTER sent_at`
  );

  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('tip_percent', '0')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('restaurant_name', 'Mi Restaurante')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('logo_url', '')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );
  await query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('login_bg_url', '')
     ON DUPLICATE KEY UPDATE setting_value = setting_value`
  );

  await safeExec(`ALTER TABLE app_settings MODIFY COLUMN setting_value TEXT NOT NULL`);

  await query(
    `CREATE TABLE IF NOT EXISTS business_profile (
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
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  const [existingProfiles] = await query(`SELECT id FROM business_profile LIMIT 1`);
  if (!existingProfiles.length) {
    const [settings] = await query(`SELECT setting_key, setting_value FROM app_settings`);
    const sMap = {};
    for (const s of settings) sMap[s.setting_key] = s.setting_value;
    await query(
      `INSERT INTO business_profile (restaurant_name, logo_url, login_bg_url, tip_percent, currency_symbol, receipt_footer)
       VALUES (?, ?, ?, ?, 'Q', '¡Gracias por su preferencia!')`,
      [
        sMap["restaurant_name"] || "Mi Restaurante",
        sMap["logo_url"] || null,
        sMap["login_bg_url"] || null,
        Number(sMap["tip_percent"] || 10),
      ]
    );
  }

  await safeExec(`ALTER TABLE modifier_groups MODIFY COLUMN group_type VARCHAR(50) NOT NULL DEFAULT 'multiple'`);

  for (const mod of MODULE_DEFAULTS) {
    await query(
      `INSERT INTO app_modules (code, label, is_active, sort_order)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order)`,
      [mod.code, mod.label, Number(mod.sortOrder || 0)]
    );
  }

  await query(
    `CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      slug VARCHAR(40) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE,
      module_code VARCHAR(30) NULL,
      description VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id),
      CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS user_roles (
      user_id INT NOT NULL,
      role_id INT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES staff_users(id),
      CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id)
    )`
  );

  const [existingRoles] = await query(`SELECT COUNT(*) AS cnt FROM roles`);
  if (Number(existingRoles[0].cnt) === 0) {
    const permissionSeeds = [
      { name: "Ver productos", slug: "products.view", module: "restaurant" },
      { name: "Crear productos", slug: "products.create", module: "restaurant" },
      { name: "Editar productos", slug: "products.edit", module: "restaurant" },
      { name: "Eliminar productos", slug: "products.delete", module: "restaurant" },
      { name: "Gestionar categorías", slug: "categories.manage", module: "restaurant" },
      { name: "Ver mesas", slug: "tables.view", module: "restaurant" },
      { name: "Gestionar mesas", slug: "tables.manage", module: "restaurant" },
      { name: "Tomar órdenes", slug: "orders.create", module: "restaurant" },
      { name: "Modificar órdenes", slug: "orders.edit", module: "restaurant" },
      { name: "Anular items", slug: "orders.void", module: "restaurant" },
      { name: "Enviar a cocina", slug: "orders.send", module: "restaurant" },
      { name: "Aplicar descuentos", slug: "orders.discount", module: "restaurant" },
      { name: "Transferir items/cuentas", slug: "orders.transfer", module: "restaurant" },
      { name: "Cuenta compartida", slug: "orders.shared", module: "restaurant" },
      { name: "Cerrar cuentas", slug: "accounts.close", module: "restaurant" },
      { name: "Anular cuentas", slug: "accounts.void", module: "restaurant" },
      { name: "Reabrir cuentas", slug: "accounts.reopen", module: "restaurant" },
      { name: "Cobrar", slug: "payments.create", module: "restaurant" },
      { name: "Reembolsar", slug: "payments.refund", module: "restaurant" },
      { name: "Abrir turno", slug: "shifts.open", module: "restaurant" },
      { name: "Cerrar turno", slug: "shifts.close", module: "restaurant" },
      { name: "Ver reportes", slug: "reports.view", module: "restaurant" },
      { name: "Exportar reportes", slug: "reports.export", module: "restaurant" },
      { name: "Acceso a configuración", slug: "settings.access", module: "restaurant" },
      { name: "Gestionar usuarios", slug: "users.manage", module: "restaurant" },
      { name: "Gestionar roles/permisos", slug: "roles.manage", module: "restaurant" },
      { name: "Ver inventario", slug: "inventory.view", module: "erp" },
      { name: "Gestionar inventario", slug: "inventory.manage", module: "erp" },
      { name: "Ver CRM", slug: "crm.view", module: "crm" },
      { name: "Gestionar CRM", slug: "crm.manage", module: "crm" },
      { name: "Ver módulo PMS", slug: "pms.view", module: "pms" },
    ];

    const permIds = {};
    for (const p of permissionSeeds) {
      const [r] = await query(
        `INSERT INTO permissions (name, slug, module_code, description) VALUES (?, ?, ?, ?)`,
        [p.name, p.slug, p.module, p.name]
      );
      permIds[p.slug] = Number(r.insertId);
    }

    const roleSeeds = [
      {
        name: "Administrador",
        slug: "admin",
        description: "Acceso total al sistema",
        perms: permissionSeeds.map((p) => p.slug),
      },
      {
        name: "Gerente",
        slug: "manager",
        description: "Gestión operativa del restaurante",
        perms: [
          "products.view",
          "products.create",
          "products.edit",
          "categories.manage",
          "tables.view",
          "tables.manage",
          "orders.create",
          "orders.edit",
          "orders.void",
          "orders.send",
          "orders.discount",
          "orders.transfer",
          "orders.shared",
          "accounts.close",
          "accounts.void",
          "accounts.reopen",
          "payments.create",
          "payments.refund",
          "shifts.open",
          "shifts.close",
          "reports.view",
          "reports.export",
          "settings.access",
          "inventory.view",
          "inventory.manage",
          "crm.view",
          "crm.manage",
          "pms.view",
        ],
      },
      {
        name: "Cajero",
        slug: "cashier",
        description: "Puede cobrar y gestionar turnos",
        perms: [
          "products.view",
          "tables.view",
          "orders.create",
          "orders.edit",
          "orders.discount",
          "orders.transfer",
          "orders.shared",
          "accounts.close",
          "accounts.void",
          "accounts.reopen",
          "payments.create",
          "payments.refund",
          "shifts.open",
          "shifts.close",
          "reports.view",
        ],
      },
      {
        name: "Mesero",
        slug: "waiter",
        description: "Puede tomar órdenes",
        perms: [
          "products.view",
          "tables.view",
          "orders.create",
          "orders.edit",
          "orders.void",
          "orders.send",
          "orders.discount",
          "orders.transfer",
        ],
      },
    ];

    for (const rs of roleSeeds) {
      const [r] = await query(
        `INSERT INTO roles (name, slug, description, is_system) VALUES (?, ?, ?, 1)`,
        [rs.name, rs.slug, rs.description]
      );
      const roleId = Number(r.insertId);
      for (const slug of rs.perms) {
        const pid = permIds[slug];
        if (pid) {
          await query(
            `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [roleId, pid]
          );
        }
      }
    }

    const [allUsers] = await query(`SELECT id, role FROM staff_users`);
    const slugToRoleId = {};
    for (const rs of roleSeeds) {
      const [row] = await query(`SELECT id FROM roles WHERE slug = ? LIMIT 1`, [rs.slug]);
      if (row.length) slugToRoleId[rs.slug] = Number(row[0].id);
    }
    for (const u of allUsers) {
      const roleSlug = String(u.role || "waiter");
      const roleId = slugToRoleId[roleSlug] || slugToRoleId["waiter"];
      if (roleId) {
        await query(
          `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [Number(u.id), roleId]
        );
      }
    }
  }

  await query(
    `UPDATE roles SET
      name = CASE slug
        WHEN 'admin' THEN 'Administrador'
        WHEN 'manager' THEN 'Gerente'
        WHEN 'cashier' THEN 'Cajero'
        WHEN 'waiter' THEN 'Mesero'
        ELSE name
      END,
      description = CASE slug
        WHEN 'admin' THEN 'Acceso total al sistema'
        WHEN 'manager' THEN 'Gestión operativa del restaurante'
        WHEN 'cashier' THEN 'Puede cobrar y gestionar turnos'
        WHEN 'waiter' THEN 'Puede tomar órdenes'
        ELSE description
      END
    WHERE is_system = 1`
  );

  const newPermissions = [
    { name: "Cuenta compartida", slug: "orders.shared", module: "restaurant" },
    { name: "Ver Dashboard Ejecutivo", slug: "dashboard.executive", module: "restaurant", description: "Acceso al Dashboard Ejecutivo y métricas financieras en tiempo real" },
  ];
  for (const p of newPermissions) {
    await query(
      `INSERT IGNORE INTO permissions (name, slug, module_code, description) VALUES (?, ?, ?, ?)`,
      [p.name, p.slug, p.module, p.description || p.name]
    );
  }

  // Asignar dashboard.executive a admin y manager automáticamente
  try {
    const [execPermRows] = await query(`SELECT id FROM permissions WHERE slug = 'dashboard.executive' LIMIT 1`);
    if (execPermRows.length) {
      const execPermId = execPermRows[0].id;
      const [execRoles] = await query(`SELECT id FROM roles WHERE slug IN ('admin', 'manager')`);
      for (const r of execRoles) {
        await query(`INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [r.id, execPermId]);
      }
    }
  } catch (permAssignErr) {
    console.warn("[MIGRATION] Error asignando dashboard.executive:", permAssignErr.message);
  }

  await safeExec(`ALTER TABLE restaurant_tables ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE shifts ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE shifts ADD COLUMN opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE shifts ADD COLUMN closing_cash DECIMAL(10,2) NULL`);
  await safeExec(
    `ALTER TABLE modifier_groups
     ADD COLUMN group_type ENUM('garnish', 'preparation', 'sauce', 'meat_term', 'milk_type', 'beverage_temp', 'ice', 'other')
     NOT NULL DEFAULT 'other'`
  );
  await safeExec(`ALTER TABLE modifier_groups ADD COLUMN is_mandatory TINYINT(1) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE modifier_groups ADD COLUMN display_method ENUM('buttons', 'radio', 'checkbox') NOT NULL DEFAULT 'buttons'`);
  await safeExec(`ALTER TABLE modifier_groups ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE modifier_options ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE product_categories ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE product_categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE product_categories ADD COLUMN color VARCHAR(7) DEFAULT '#6366f1'`);
  await safeExec(`ALTER TABLE product_categories ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE production_centers ADD COLUMN operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE dining_areas ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`);
  await safeExec(`ALTER TABLE dining_areas ADD COLUMN sort_order INT NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE order_items ADD COLUMN sent_at DATETIME NULL`);
  await safeExec(`ALTER TABLE account_payments MODIFY COLUMN method VARCHAR(50) NOT NULL`);
  await safeExec(`ALTER TABLE accounts ADD COLUMN tip_percent_override DECIMAL(5,2) NULL`);
  await safeExec(`ALTER TABLE products ADD COLUMN track_inventory TINYINT(1) NOT NULL DEFAULT 0`);

  await query(
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(20) NOT NULL DEFAULT 'pz',
      current_stock DECIMAL(12,4) NOT NULL DEFAULT 0,
      min_stock DECIMAL(12,4) NOT NULL DEFAULT 0,
      cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS product_recipes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      inventory_item_id INT NOT NULL,
      quantity DECIMAL(12,4) NOT NULL
    )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      inventory_item_id INT NOT NULL,
      type ENUM('entry', 'exit', 'adjustment') NOT NULL,
      quantity DECIMAL(12,4) NOT NULL,
      reference_type VARCHAR(50),
      reference_id INT,
      note TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const [existingCenters] = await query(`SELECT id FROM operation_centers ORDER BY id LIMIT 1`);
  let defaultCenterId = existingCenters.length ? Number(existingCenters[0].id) : null;
  if (!defaultCenterId) {
    const [inserted] = await query(`INSERT INTO operation_centers (name, is_active) VALUES ('Centro Principal', 1)`);
    defaultCenterId = Number(inserted.insertId);
  }

  await query(`UPDATE restaurant_tables SET operation_center_id = ? WHERE operation_center_id IS NULL`, [defaultCenterId]);
  await query(`UPDATE shifts SET operation_center_id = ? WHERE operation_center_id IS NULL`, [defaultCenterId]);

  const [admins] = await query(`SELECT id FROM staff_users WHERE role = 'admin' LIMIT 1`);
  if (!admins.length) {
    await query(
      `UPDATE staff_users
       SET role = 'admin'
       WHERE role = 'manager'
       ORDER BY id
       LIMIT 1`
    );
  }

  // ───────── Matriz de Enrutamiento (Comandas / KDS / Impresión) ─────────
  await query(`
    CREATE TABLE IF NOT EXISTS categorias_impresion (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(80) NOT NULL,
      descripcion VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await safeExec(`ALTER TABLE products ADD COLUMN categoria_impresion_id INT NULL`);
  await safeExec(`ALTER TABLE products ADD COLUMN centro_produccion_exclusivo_id INT NULL`);
  await safeExec(`ALTER TABLE terminals ADD COLUMN area_trabajo_id INT NULL`);
  await safeExec(`ALTER TABLE terminals ADD COLUMN is_kds TINYINT(1) NOT NULL DEFAULT 0`);
  await safeExec(`ALTER TABLE terminals ADD COLUMN kds_production_center_id INT NULL`);
  await safeExec(`ALTER TABLE terminals ADD COLUMN kds_operation_center_id INT NULL`);
  await safeExec(`ALTER TABLE terminals ADD COLUMN device_serial VARCHAR(128) NULL`);
  await safeExec(`ALTER TABLE order_items ADD COLUMN production_center_id INT NULL`);

  await query(`
    CREATE TABLE IF NOT EXISTS matriz_enrutamiento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      area_trabajo_id INT NOT NULL,
      categoria_impresion_id INT NOT NULL,
      centro_produccion_id INT NOT NULL,
      UNIQUE KEY uq_area_cat (area_trabajo_id, categoria_impresion_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Auto-poblado inicial de categorías de impresión desde product_categories
  const [catImpRows] = await query(`SELECT COUNT(*) as c FROM categorias_impresion`);
  if (catImpRows[0].c === 0) {
    await query(`
      INSERT INTO categorias_impresion (id, nombre)
      SELECT id, name FROM product_categories
      ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
    `);
  }

  // Asignar categoria_impresion_id en productos si es NULL
  await query(`
    UPDATE products p
    SET p.categoria_impresion_id = p.category_id
    WHERE p.categoria_impresion_id IS NULL AND p.category_id IS NOT NULL
  `);

  // Poblar matriz inicial cruzando dining_areas con product_production_centers
  const [matrizRows] = await query(`SELECT COUNT(*) as c FROM matriz_enrutamiento`);
  if (matrizRows[0].c === 0) {
    await query(`
      INSERT IGNORE INTO matriz_enrutamiento (area_trabajo_id, categoria_impresion_id, centro_produccion_id)
      SELECT da.id, p.categoria_impresion_id, ppc.center_id
      FROM dining_areas da
      CROSS JOIN products p
      INNER JOIN product_production_centers ppc ON ppc.product_id = p.id
      WHERE p.categoria_impresion_id IS NOT NULL AND ppc.center_id IS NOT NULL
      GROUP BY da.id, p.categoria_impresion_id
    `);
  }

  // Asignar area_trabajo_id por defecto a terminales si es NULL
  const [firstArea] = await query(`SELECT id FROM dining_areas WHERE is_active = 1 ORDER BY sort_order, id LIMIT 1`);
  if (firstArea.length) {
    await query(`UPDATE terminals SET area_trabajo_id = ? WHERE area_trabajo_id IS NULL`, [firstArea[0].id]);
  }

  // Asegurar tablas del módulo de Facturación Electrónica (FEL)
  try {
    const { ensureFelTables } = require("../fel/fel.migration");
    await ensureFelTables();
  } catch (felErr) {
    console.warn("[MIGRATION] Error asegurando tablas FEL:", felErr.message);
  }

  // Asegurar columnas y tablas del módulo de Sincronización Offline
  try {
    const { ensureSyncTables } = require("../sync/sync.migration");
    await ensureSyncTables();
  } catch (syncErr) {
    console.warn("[MIGRATION] Error asegurando tablas de sincronización:", syncErr.message);
  }

  // Asegurar columna default_view en roles y permisos de navegación de vistas
  try {
    await safeExec(`ALTER TABLE roles ADD COLUMN default_view VARCHAR(40) NOT NULL DEFAULT 'dashboard'`);
    await query(`UPDATE roles SET default_view = 'tables' WHERE slug = 'waiter' AND (default_view = 'dashboard' OR default_view IS NULL)`);
    await query(`UPDATE roles SET default_view = 'kds' WHERE slug = 'kitchen' AND (default_view = 'dashboard' OR default_view IS NULL)`);
    await query(`UPDATE roles SET default_view = 'shifts' WHERE slug = 'cashier' AND (default_view = 'dashboard' OR default_view IS NULL)`);

    // Sembrar permisos de navegación de vistas
    const viewPermissions = [
      { name: "Ver Inicio / Dashboard", slug: "views.dashboard", module: "views", desc: "Acceso a la pantalla principal de inicio y accesos rápidos" },
      { name: "Ver Mesas y Salones", slug: "views.tables", module: "views", desc: "Acceso al mapa de mesas para toma de pedidos" },
      { name: "Ver Pantalla de Cocina (KDS)", slug: "views.kds", module: "views", desc: "Acceso a la pantalla de cocina y preparación de comandas" },
      { name: "Ver Turnos y Cajas", slug: "views.shifts", module: "views", desc: "Acceso al módulo de arqueos, aperturas y cortes de caja" },
      { name: "Ver Reportes", slug: "views.reports", module: "views", desc: "Acceso a reportes de ventas, cortes y propinas" },
      { name: "Ver Reimpresión de Cuentas", slug: "views.reprint", module: "views", desc: "Acceso a consulta y reimpresión de recibos" },
      { name: "Ver Dashboard Ejecutivo", slug: "views.executive", module: "views", desc: "Acceso a métricas y analítica ejecutiva en vivo" },
      { name: "Ver Cuentas por Cobrar (CXC)", slug: "views.cxc", module: "views", desc: "Acceso a créditos de clientes y cuentas por cobrar" },
      { name: "Ver Cuentas y Pagos (Cuentas Abiertas)", slug: "views.accounts", module: "views", desc: "Acceso al módulo de cuentas abiertas, cobros y pre-cuentas" },
    ];

    for (const vp of viewPermissions) {
      await query(`
        INSERT INTO permissions (name, slug, module_code, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), module_code = VALUES(module_code), description = VALUES(description)
      `, [vp.name, vp.slug, vp.module, vp.desc]);
    }

    // Asignar permisos de vistas al Administrador y Superadmin
    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.slug IN ('admin', 'superadmin') AND p.slug LIKE 'views.%'
    `);

    // Asignar permiso de ver mesas a meseros si no lo tienen
    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.slug = 'waiter' AND p.slug = 'views.tables'
    `);

    // Asignar permiso de ver kds a cocina
    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.slug = 'kitchen' AND p.slug = 'views.kds'
    `);
  } catch (viewPermErr) {
    console.warn("[MIGRATION] Error asegurando permisos de vistas:", viewPermErr.message);
  }
}

module.exports = {
  ensureConfigTables,
  PAYMENT_METHOD_DEFAULTS,
  MODULE_DEFAULTS,
};
