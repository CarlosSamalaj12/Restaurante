// src/modules/digital_menu/digital_menu.repository.js
// Acceso a datos para Menús Digitales, Categorías, Platillos, Promociones, Tokens QR y Sesiones

const { query, withTransaction } = require("../../common/db");

const digitalMenuRepository = {
  // ─── Control de Módulo Premium en app_settings ───
  async isModuleEnabled() {
    const [rows] = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'module_digital_menu_enabled' LIMIT 1`
    );
    if (!rows.length) return false;
    return String(rows[0].setting_value).trim() === "1";
  },

  async setModuleEnabled(enabled) {
    const val = enabled ? "1" : "0";
    await query(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES ('module_digital_menu_enabled', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [val]
    );
  },

  // ─── Gestión de Menús ───
  async getMenus(onlyActive = false) {
    const where = onlyActive ? "WHERE is_active = 1" : "";
    const [rows] = await query(`SELECT * FROM digital_menus ${where} ORDER BY id ASC`);
    return rows.map((r) => ({
      ...r,
      social_links: typeof r.social_links === "string" ? JSON.parse(r.social_links || "{}") : r.social_links,
    }));
  },

  async getMenuBySlug(slug) {
    const [rows] = await query(`SELECT * FROM digital_menus WHERE slug = ? LIMIT 1`, [slug]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...r,
      social_links: typeof r.social_links === "string" ? JSON.parse(r.social_links || "{}") : r.social_links,
    };
  },

  async getMenuById(id) {
    const [rows] = await query(`SELECT * FROM digital_menus WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...r,
      social_links: typeof r.social_links === "string" ? JSON.parse(r.social_links || "{}") : r.social_links,
    };
  },

  async createMenu(data) {
    const socialJson = JSON.stringify(data.social_links || {});
    const [res] = await query(
      `INSERT INTO digital_menus 
        (name, slug, description, mode, primary_color, secondary_color, bg_color, text_color, font_family, logo_url, banner_url, social_links, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.slug,
        data.description || "",
        data.mode || "interactive",
        data.primary_color || "#E63946",
        data.secondary_color || "#1D3557",
        data.bg_color || "#0F172A",
        data.text_color || "#F8FAFC",
        data.font_family || "Inter, sans-serif",
        data.logo_url || null,
        data.banner_url || null,
        socialJson,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      ]
    );
    return res.insertId;
  },

  async updateMenu(id, data) {
    const socialJson = data.social_links ? JSON.stringify(data.social_links) : undefined;
    const fields = [];
    const values = [];

    const allowed = [
      "name",
      "slug",
      "description",
      "mode",
      "primary_color",
      "secondary_color",
      "bg_color",
      "text_color",
      "font_family",
      "logo_url",
      "banner_url",
      "is_active",
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === "is_active" ? (data[key] ? 1 : 0) : data[key]);
      }
    }

    if (socialJson !== undefined) {
      fields.push(`social_links = ?`);
      values.push(socialJson);
    }

    if (!fields.length) return;
    values.push(id);
    await query(`UPDATE digital_menus SET ${fields.join(", ")} WHERE id = ?`, values);
  },

  async deleteMenu(id) {
    await query(`DELETE FROM digital_menus WHERE id = ?`, [id]);
  },

  // ─── Categorías y Productos asignados al Menú ───
  async getMenuCategories(menuId) {
    const [rows] = await query(
      `SELECT pc.id, pc.name, pc.color, dmc.sort_order
       FROM digital_menu_categories dmc
       INNER JOIN product_categories pc ON pc.id = dmc.category_id
       WHERE dmc.menu_id = ? AND pc.is_active = 1
       ORDER BY dmc.sort_order ASC, pc.name ASC`,
      [menuId]
    );
    return rows;
  },

  async getMenuProducts(menuId, categoryId = null) {
    let catClause = "";
    const params = [menuId];
    if (categoryId) {
      catClause = "AND p.category_id = ?";
      params.push(categoryId);
    }

    const [rows] = await query(
      `SELECT p.id, p.category_id, p.name, p.base_price,
              p.image_url, p.description, p.dietary_tags, p.estimated_prep_min,
              COALESCE(p.rating_avg, 5.0) AS rating_avg,
              COALESCE(p.rating_count, 0) AS rating_count,
              dmp.is_featured, dmp.sort_order
       FROM digital_menu_products dmp
       INNER JOIN products p ON p.id = dmp.product_id
       WHERE dmp.menu_id = ? AND p.is_active = 1 ${catClause}
       ORDER BY dmp.is_featured DESC, dmp.sort_order ASC, p.name ASC`,
      params
    );

    return rows.map((r) => ({
      ...r,
      rating_avg: Number(Number(r.rating_avg || 5.0).toFixed(1)),
      rating_count: Number(r.rating_count || 0),
      sales_count: Number(r.rating_count || 0),
      dietary_tags: typeof r.dietary_tags === "string" ? JSON.parse(r.dietary_tags || "[]") : r.dietary_tags || [],
    }));
  },

  async syncMenuCategories(menuId, categoryIds = []) {
    await withTransaction(async (conn) => {
      await query(`DELETE FROM digital_menu_categories WHERE menu_id = ?`, [menuId], conn);
      if (categoryIds.length) {
        const values = categoryIds.map((catId, idx) => [menuId, catId, idx + 1]);
        await query(`INSERT INTO digital_menu_categories (menu_id, category_id, sort_order) VALUES ?`, [values], conn);
      }
    });
  },

  async syncMenuProducts(menuId, productIds = []) {
    await withTransaction(async (conn) => {
      await query(`DELETE FROM digital_menu_products WHERE menu_id = ?`, [menuId], conn);
      if (productIds.length) {
        const values = productIds.map((prodId, idx) => [menuId, prodId, 0, idx + 1]);
        await query(`INSERT INTO digital_menu_products (menu_id, product_id, is_featured, sort_order) VALUES ?`, [values], conn);
      }
    });
  },

  // ─── Detalle de Producto con Grupos de Modificadores ───
  async getProductDetail(productId) {
    const [products] = await query(
      `SELECT p.id, p.category_id, p.name, p.base_price,
              p.image_url, p.description, p.dietary_tags, p.estimated_prep_min,
              COALESCE(p.rating_avg, 5.0) AS rating_avg,
              COALESCE(p.rating_count, 0) AS rating_count
       FROM products p
       WHERE p.id = ? AND p.is_active = 1`,
      [productId]
    );
    if (!products.length) return null;
    const prod = products[0];

    // Obtener grupos de modificadores
    const [groups] = await query(
      `SELECT mg.id, mg.name, mg.group_type, mg.min_select, mg.max_select, mg.is_mandatory, mg.display_method
       FROM product_modifier_groups pmg
       INNER JOIN modifier_groups mg ON mg.id = pmg.group_id
       WHERE pmg.product_id = ? AND mg.is_active = 1
       ORDER BY pmg.sort_order ASC, mg.name ASC`,
      [productId]
    );

    const groupIds = groups.map((g) => g.id);
    let optionsByGroup = {};

    if (groupIds.length) {
      const [options] = await query(
        `SELECT id, group_id, name, price_delta
         FROM modifier_options
         WHERE group_id IN (?) AND is_active = 1
         ORDER BY sort_order ASC, name ASC`,
        [groupIds]
      );

      optionsByGroup = options.reduce((acc, opt) => {
        if (!acc[opt.group_id]) acc[opt.group_id] = [];
        acc[opt.group_id].push(opt);
        return acc;
      }, {});
    }

    const modifierGroups = groups.map((g) => ({
      ...g,
      options: optionsByGroup[g.id] || [],
    }));

    // Reseñas aprobadas
    const [reviews] = await query(
      `SELECT id, rating, comment, diner_name, created_at
       FROM product_reviews
       WHERE product_id = ? AND is_approved = 1
       ORDER BY id DESC LIMIT 15`,
      [productId]
    );

    return {
      ...prod,
      rating_avg: Number(Number(prod.rating_avg || 5.0).toFixed(1)),
      rating_count: Number(prod.rating_count || 0),
      sales_count: Number(prod.rating_count || 0),
      dietary_tags: typeof prod.dietary_tags === "string" ? JSON.parse(prod.dietary_tags || "[]") : prod.dietary_tags || [],
      modifier_groups: modifierGroups,
      reviews,
    };
  },

  // ─── Promociones (Hero Carousel) ───
  async getPromotions(menuId) {
    const [rows] = await query(
      `SELECT * FROM digital_promotions
       WHERE menu_id = ? AND is_active = 1
       ORDER BY sort_order ASC, id DESC`,
      [menuId]
    );
    return rows;
  },

  async createPromotion(data) {
    const [res] = await query(
      `INSERT INTO digital_promotions (menu_id, title, subtitle, badge_text, image_url, target_type, target_id, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.menu_id,
        data.title,
        data.subtitle || null,
        data.badge_text || null,
        data.image_url,
        data.target_type || "product",
        data.target_id || null,
        data.sort_order || 0,
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      ]
    );
    return res.insertId;
  },

  async deletePromotion(id) {
    await query(`DELETE FROM digital_promotions WHERE id = ?`, [id]);
  },

  // ─── Tokens Criptográficos de Mesa (QR / NFC) ───
  async findTableByTokenHash(tokenHash) {
    const [rows] = await query(
      `SELECT tqt.*, t.id AS table_id, t.code AS table_code, t.is_active AS table_is_active,
              t.operation_center_id, dm.id AS menu_id, dm.slug AS menu_slug, dm.mode AS menu_mode
       FROM table_qr_tokens tqt
       INNER JOIN restaurant_tables t ON t.id = tqt.table_id
       INNER JOIN digital_menus dm ON dm.id = tqt.menu_id
       WHERE tqt.token_hash = ? AND tqt.is_active = 1`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  async getTableToken(tableId, menuId) {
    const [rows] = await query(
      `SELECT * FROM table_qr_tokens WHERE table_id = ? AND menu_id = ? AND is_active = 1 LIMIT 1`,
      [tableId, menuId]
    );
    return rows[0] || null;
  },

  async upsertTableToken(tableId, menuId, tokenHash, salt) {
    await query(
      `INSERT INTO table_qr_tokens (table_id, menu_id, token_hash, salt, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), salt = VALUES(salt), is_active = 1`,
      [tableId, menuId, tokenHash, salt]
    );
  },

  async regenerateTableToken(tableId, menuId, tokenHash, salt) {
    await query(
      `UPDATE table_qr_tokens 
       SET token_hash = ?, salt = ?, regenerated_at = NOW(), is_active = 1
       WHERE table_id = ? AND menu_id = ?`,
      [tokenHash, salt, tableId, menuId]
    );
  },

  async getAllTableTokens(menuId) {
    const [rows] = await query(
      `SELECT tqt.id AS token_id, tqt.token_hash, tqt.salt, tqt.regenerated_at,
              t.id AS table_id, t.code AS table_code, t.seats, da.name AS area_name
       FROM restaurant_tables t
       INNER JOIN dining_areas da ON da.id = t.area_id
       LEFT JOIN table_qr_tokens tqt ON tqt.table_id = t.id AND tqt.menu_id = ?
       WHERE t.is_active = 1
       ORDER BY da.sort_order ASC, t.code ASC`,
      [menuId]
    );
    return rows;
  },

  // ─── Sesiones Activas de Dispositivos de Comensales ───
  async findSessionByToken(sessionToken) {
    const [rows] = await query(
      `SELECT dds.*, a.status AS account_status, a.check_number, t.code AS table_code
       FROM diner_device_sessions dds
       INNER JOIN accounts a ON a.id = dds.account_id
       INNER JOIN restaurant_tables t ON t.id = dds.table_id
       WHERE dds.session_token = ? LIMIT 1`,
      [sessionToken]
    );
    return rows[0] || null;
  },

  async findActiveSession(tableId, deviceFingerprint) {
    const [rows] = await query(
      `SELECT dds.*, a.status AS account_status, a.check_number
       FROM diner_device_sessions dds
       INNER JOIN accounts a ON a.id = dds.account_id
       WHERE dds.table_id = ? AND dds.device_fingerprint = ? AND dds.status = 'active' AND a.status = 'open'
       ORDER BY dds.id DESC LIMIT 1`,
      [tableId, deviceFingerprint]
    );
    return rows[0] || null;
  },

  async createDeviceSession({ sessionToken, deviceFingerprint, tableId, accountId, menuId, guestAlias }) {
    await query(
      `INSERT INTO diner_device_sessions 
        (session_token, device_fingerprint, table_id, account_id, menu_id, guest_alias, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [sessionToken, deviceFingerprint, tableId, accountId, menuId, guestAlias || "Comensal"]
    );
  },

  async closeDeviceSession(sessionToken) {
    await query(
      `UPDATE diner_device_sessions SET status = 'closed' WHERE session_token = ?`,
      [sessionToken]
    );
  },

  async findOpenAccountsForTable(tableId) {
    const [rows] = await query(
      `SELECT a.id, a.check_number, a.order_source, a.opened_at, a.guest_count
       FROM accounts a
       WHERE a.table_id = ? AND a.status = 'open'
       ORDER BY a.id ASC`,
      [tableId]
    );
    return rows;
  },

  // ─── Reseñas de Platillos ───
  async createReview({ productId, accountId, rating, comment, dinerName }) {
    const [res] = await query(
      `INSERT INTO product_reviews (product_id, account_id, rating, comment, diner_name, is_approved)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [productId, accountId, rating, comment || null, dinerName || "Comensal"]
    );

    // Recalcular estadísticas del producto
    const [stats] = await query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS count_rating
       FROM product_reviews
       WHERE product_id = ? AND is_approved = 1`,
      [productId]
    );

    if (stats.length) {
      const avg = Number(stats[0].avg_rating || 5.0).toFixed(2);
      const cnt = Number(stats[0].count_rating || 0);
      await query(
        `UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?`,
        [avg, cnt, productId]
      );
    }

    return res.insertId;
  },

  // ─── Actualización Rápida de Multimedia y Atributos de Platillo ───
  async updateProductDigitalInfo(productId, { image_url, description, estimated_prep_min }) {
    const fields = [];
    const values = [];

    if (image_url !== undefined) {
      fields.push("image_url = ?");
      values.push(image_url);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }
    if (estimated_prep_min !== undefined) {
      fields.push("estimated_prep_min = ?");
      values.push(estimated_prep_min);
    }

    if (fields.length === 0) return;

    values.push(productId);
    await query(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);
  },
};

module.exports = digitalMenuRepository;
