// src/modules/catalog/catalog.service.js
// Lógica de negocio para catálogo, productos, categorías y modificadores

const catalogRepository = require("./catalog.repository");
const { withTransaction } = require("../../common/db");
const { BadRequestError } = require("../../common/errors");
const { normalizeGroupType } = require("../../common/utils");

const MODIFIER_TEMPLATES = {
  garnish: {
    type: "garnish",
    label: "Guarniciones",
    name: "Guarniciones",
    description: "Acompañamientos del platillo (Arroz, Papa, Ensalada, etc)",
    defaultMinSelect: 2,
    defaultMaxSelect: 2,
    min: 2,
    max: 2,
    defaultDisplayMethod: "checkbox",
    display: "checkbox",
    defaultIsMandatory: true,
    mandatory: 1,
  },
  preparation: {
    type: "preparation",
    label: "Método de Preparación",
    name: "Método de Preparación",
    description: "Cómo deseas que se prepare (Al Grill, Frito, Horneado, etc)",
    defaultMinSelect: 1,
    defaultMaxSelect: 1,
    min: 1,
    max: 1,
    defaultDisplayMethod: "radio",
    display: "radio",
    defaultIsMandatory: false,
    mandatory: 0,
  },
  sauce: {
    type: "sauce",
    label: "Salsas",
    name: "Salsas",
    description: "Salsas adicionales para el platillo",
    defaultMinSelect: 0,
    defaultMaxSelect: 2,
    min: 0,
    max: 2,
    defaultDisplayMethod: "checkbox",
    display: "checkbox",
    defaultIsMandatory: false,
    mandatory: 0,
  },
  meat_term: {
    type: "meat_term",
    label: "Término de Cocción",
    name: "Término de Cocción",
    description: "Punto de cocción de la carne (Rojo, Medio, Bien Cocido)",
    defaultMinSelect: 1,
    defaultMaxSelect: 1,
    min: 1,
    max: 1,
    defaultDisplayMethod: "radio",
    display: "radio",
    defaultIsMandatory: true,
    mandatory: 1,
  },
  milk_type: {
    type: "milk_type",
    label: "Tipo de Leche",
    name: "Tipo de Leche",
    description: "Tipo de leche para bebidas (Entera, Deslactosada, Almendra)",
    defaultMinSelect: 1,
    defaultMaxSelect: 1,
    min: 1,
    max: 1,
    defaultDisplayMethod: "radio",
    display: "radio",
    defaultIsMandatory: true,
    mandatory: 1,
  },
  beverage_temp: {
    type: "beverage_temp",
    label: "Temperatura de Bebida",
    name: "Temperatura",
    description: "Temperatura de la bebida (Caliente, Frío, Tibio)",
    defaultMinSelect: 1,
    defaultMaxSelect: 1,
    min: 1,
    max: 1,
    defaultDisplayMethod: "radio",
    display: "radio",
    defaultIsMandatory: true,
    mandatory: 1,
  },
  ice: {
    type: "ice",
    label: "Hielo",
    name: "Hielo",
    description: "Preferencia de hielo",
    defaultMinSelect: 0,
    defaultMaxSelect: 1,
    min: 0,
    max: 1,
    defaultDisplayMethod: "radio",
    display: "radio",
    defaultIsMandatory: false,
    mandatory: 0,
  },
};

const catalogService = {
  getModifierTemplates() {
    return MODIFIER_TEMPLATES;
  },

  async getCatalogProducts({ categoryId = 0, centerId = 0 }) {
    const products = await catalogRepository.getProducts({ categoryId, centerId });
    const ids = products.map((p) => p.id);
    if (!ids.length) return [];

    const groups = await catalogRepository.getModifierGroupsByProductIds(ids);
    const groupIds = [...new Set(groups.map((g) => g.group_id))];

    let optionsByGroup = {};
    if (groupIds.length) {
      const options = await catalogRepository.getModifierOptionsByGroupIds(groupIds);
      optionsByGroup = options.reduce((acc, op) => {
        acc[op.group_id] = acc[op.group_id] || [];
        acc[op.group_id].push(op);
        return acc;
      }, {});
    }

    const groupsByProduct = groups.reduce((acc, g) => {
      acc[g.product_id] = acc[g.product_id] || [];
      acc[g.product_id].push({
        groupId: g.group_id,
        name: g.name,
        minSelect: g.min_select,
        maxSelect: g.max_select,
        options: optionsByGroup[g.group_id] || [],
      });
      return acc;
    }, {});

    return products.map((p) => ({
      ...p,
      modifiers: groupsByProduct[p.id] || [],
    }));
  },

  async getCatalogCategories({ centerId = 0 }) {
    return catalogRepository.getCatalogCategories({ centerId });
  },

  // Category management
  async createCategory({ name, isActive = 1, sortOrder = 0, color = "#6366f1", centerId = null }) {
    if (!name || !String(name).trim()) {
      throw new BadRequestError("name es requerido");
    }
    const categoryId = await catalogRepository.createCategory({
      name: String(name).trim(),
      isActive,
      sortOrder,
      color,
      centerId,
    });
    return { categoryId };
  },

  async updateCategory(categoryId, { name, isActive = 1, sortOrder = 0, color = "#6366f1", centerId = null }) {
    const id = Number(categoryId);
    if (!id || id <= 0 || !name || !String(name).trim()) {
      throw new BadRequestError("categoryId y name son requeridos");
    }
    await catalogRepository.updateCategory(id, {
      name: String(name).trim(),
      isActive,
      sortOrder,
      color,
      centerId,
    });
    return { ok: true };
  },

  async reorderCategories(order) {
    if (!Array.isArray(order) || !order.length) {
      throw new BadRequestError("Se requiere un arreglo 'order' con { id, sortOrder }");
    }
    await catalogRepository.reorderCategories(order);
    return { success: true };
  },

  async deleteCategory(categoryId) {
    const id = Number(categoryId);
    if (!id || id <= 0) {
      throw new BadRequestError("categoryId es requerido");
    }
    const count = await catalogRepository.countProductsInCategory(id);
    if (count > 0) {
      throw new BadRequestError("No se puede eliminar la categoría porque tiene productos asociados");
    }
    await catalogRepository.deleteCategory(id);
    return { ok: true };
  },

  // Product management
  async createProduct({ categoryId, name, basePrice = 0, allowDiscount = 1, trackInventory = 0 }) {
    if (!categoryId || !name || !String(name).trim()) {
      throw new BadRequestError("categoryId y name son requeridos");
    }
    const productId = await catalogRepository.createProduct({
      categoryId: Number(categoryId),
      name: String(name).trim(),
      basePrice: Number(basePrice) || 0,
      allowDiscount,
      trackInventory,
    });
    return { productId };
  },

  async updateProduct(productId, { categoryId, name, basePrice = 0, allowDiscount = 1, isActive = 1, trackInventory = 0 }) {
    const id = Number(productId);
    if (!id || id <= 0 || !categoryId || !name || !String(name).trim()) {
      throw new BadRequestError("productId, categoryId y name son requeridos");
    }
    await catalogRepository.updateProduct(id, {
      categoryId: Number(categoryId),
      name: String(name).trim(),
      basePrice: Number(basePrice) || 0,
      allowDiscount,
      isActive,
      trackInventory,
    });
    return { ok: true };
  },

  async createProductComplete({ categoryId, name, basePrice = 0, allowDiscount = 1, modifierGroups = [] }) {
    if (!categoryId || !name || !String(name).trim()) {
      throw new BadRequestError("categoryId y name son requeridos");
    }

    return withTransaction(async (conn) => {
      const productId = await catalogRepository.createProduct(
        {
          categoryId: Number(categoryId),
          name: String(name).trim(),
          basePrice: Number(basePrice) || 0,
          allowDiscount,
        },
        conn
      );

      let sortOrder = 0;
      for (const mgConfig of modifierGroups) {
        const { groupType, minSelect = null, maxSelect = null, isMandatory = null, options = [] } = mgConfig;
        if (!groupType) continue;

        const template = MODIFIER_TEMPLATES[groupType] || {
          name: groupType,
          min: 0,
          max: 1,
          mandatory: 0,
          display: "radio",
        };

        const finalMin = Math.max(0, Number(minSelect ?? template.min ?? 0));
        const finalMax = Math.max(finalMin, Number(maxSelect ?? template.max ?? 1));
        const finalMandatory =
          isMandatory === null || typeof isMandatory === "undefined"
            ? Number(template.mandatory)
            : Number(Boolean(isMandatory));

        if (finalMax <= 0) {
          throw new BadRequestError(`Config invalida para ${template.name}: maxSelect debe ser mayor que 0`);
        }
        if (!Array.isArray(options) || !options.length) {
          throw new BadRequestError(`Config invalida para ${template.name}: debes enviar opciones`);
        }

        const groupId = await catalogRepository.createModifierGroup(
          {
            name: template.name,
            groupType,
            minSelect: finalMin,
            maxSelect: finalMax,
            isMandatory: finalMandatory,
            displayMethod: template.display,
            sortOrder,
            isActive: 1,
          },
          conn
        );

        for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
          const option = options[optionIndex];
          if (!option.name || !String(option.name).trim()) continue;
          await catalogRepository.createModifierOption(
            {
              groupId,
              name: String(option.name).trim(),
              priceDelta: Number(option.priceDelta) || 0,
              sortOrder: optionIndex + 1,
              isActive: 1,
            },
            conn
          );
        }

        await catalogRepository.addProductStep(
          {
            productId,
            groupId,
            sortOrder,
          },
          conn
        );

        sortOrder++;
      }

      return { productId, success: true };
    });
  },

  async deleteProduct(productId) {
    const id = Number(productId);
    if (!id || id <= 0) {
      throw new BadRequestError("productId es requerido");
    }
    const hasSales = await catalogRepository.hasSalesForProduct(id);
    if (hasSales) {
      throw new BadRequestError("No se puede eliminar el producto porque tiene ventas asociadas");
    }
    await catalogRepository.deleteProduct(id);
    return { ok: true };
  },

  async setProductProductionCenters(productId, centerIds) {
    const id = Number(productId);
    if (!id || id <= 0) {
      throw new BadRequestError("productId es requerido");
    }
    await catalogRepository.setProductProductionCenters(id, Array.isArray(centerIds) ? centerIds : []);
    return { ok: true };
  },

  // Modifiers
  async createModifierGroup({ name, minSelect = 0, maxSelect = 1, sortOrder = 0, isActive = 1, groupType = "other" }) {
    if (!name || !String(name).trim()) {
      throw new BadRequestError("name es requerido");
    }
    const min = Number(minSelect) || 0;
    const max = Number(maxSelect) || 0;
    const normalizedType = normalizeGroupType(groupType, min, max);
    const isSingle = normalizedType === "single" || (min === 1 && max === 1);
    const resolvedDisplay = isSingle ? "radio" : "checkbox";
    const resolvedMandatory = min > 0 ? 1 : 0;

    const groupId = await catalogRepository.createModifierGroup({
      name: String(name).trim(),
      groupType: normalizedType,
      minSelect: min,
      maxSelect: max,
      isMandatory: resolvedMandatory,
      displayMethod: resolvedDisplay,
      sortOrder: Number(sortOrder) || 0,
      isActive: Number(isActive) ? 1 : 0,
    });
    return { groupId };
  },

  async updateModifierGroup(groupId, { name, minSelect = 0, maxSelect = 1, sortOrder = 0, isActive = 1, groupType = "multiple" }) {
    const id = Number(groupId);
    if (!id || id <= 0 || !name || !String(name).trim()) {
      throw new BadRequestError("groupId y name son requeridos");
    }
    const min = Number(minSelect) || 0;
    const max = Number(maxSelect) || 0;
    if (max < min) {
      throw new BadRequestError("maxSelect no puede ser menor que minSelect");
    }
    const normalizedType = normalizeGroupType(groupType, min, max);
    const isSingle = normalizedType === "single" || (min === 1 && max === 1);
    const resolvedDisplay = isSingle ? "radio" : "checkbox";
    const resolvedMandatory = min > 0 ? 1 : 0;

    await catalogRepository.updateModifierGroup(id, {
      name: String(name).trim(),
      groupType: normalizedType,
      minSelect: min,
      maxSelect: max,
      isMandatory: resolvedMandatory,
      displayMethod: resolvedDisplay,
      sortOrder: Number(sortOrder) || 0,
      isActive: Number(isActive) ? 1 : 0,
    });
    return { ok: true };
  },

  async deleteModifierGroup(groupId) {
    const id = Number(groupId);
    if (!id || id <= 0) {
      throw new BadRequestError("groupId es requerido");
    }
    const assignedProducts = await catalogRepository.getProductsAssignedToModifierGroup(id);
    if (assignedProducts.length > 0) {
      const names = assignedProducts.map((p) => p.name).join(", ");
      const error = new BadRequestError(`Está asignado a: ${names}`);
      error.products = assignedProducts;
      throw error;
    }
    await catalogRepository.deleteModifierGroup(id);
    return { ok: true };
  },

  async createModifierOption(groupId, { name, priceDelta = 0, sortOrder = 0, isActive = 1 }) {
    const gid = Number(groupId);
    if (!gid || gid <= 0 || !name || !String(name).trim()) {
      throw new BadRequestError("groupId y name son requeridos");
    }
    await catalogRepository.createModifierOption({
      groupId: gid,
      name: String(name).trim(),
      priceDelta: Number(priceDelta) || 0,
      sortOrder: Number(sortOrder) || 0,
      isActive: Number(isActive) ? 1 : 0,
    });
    return { ok: true };
  },

  async updateModifierOption(optionId, { name, priceDelta = 0, sortOrder = 0, isActive = 1 }) {
    const oid = Number(optionId);
    if (!oid || oid <= 0 || !name || !String(name).trim()) {
      throw new BadRequestError("optionId y name son requeridos");
    }
    await catalogRepository.updateModifierOption(oid, {
      name: String(name).trim(),
      priceDelta: Number(priceDelta) || 0,
      sortOrder: Number(sortOrder) || 0,
      isActive: Number(isActive) ? 1 : 0,
    });
    return { ok: true };
  },

  async deleteModifierOption(optionId) {
    const oid = Number(optionId);
    if (!oid || oid <= 0) {
      throw new BadRequestError("optionId es requerido");
    }
    await catalogRepository.deleteModifierOption(oid);
    return { ok: true };
  },

  // Steps
  async addProductStep({ productId, groupId, sortOrder = 0 }) {
    const pid = Number(productId);
    const gid = Number(groupId);
    if (!pid || !gid) {
      throw new BadRequestError("productId y groupId son requeridos");
    }
    await catalogRepository.addProductStep({
      productId: pid,
      groupId: gid,
      sortOrder: Number(sortOrder) || 0,
    });
    return { ok: true };
  },

  async deleteProductStep(productId, groupId) {
    const pid = Number(productId);
    const gid = Number(groupId);
    if (!pid || !gid) {
      throw new BadRequestError("productId y groupId son requeridos");
    }
    await catalogRepository.deleteProductStep(pid, gid);
    return { ok: true };
  },

  async deleteAllProductSteps(productId) {
    const pid = Number(productId);
    if (!pid) {
      throw new BadRequestError("productId es requerido");
    }
    await catalogRepository.deleteAllProductSteps(pid);
    return { ok: true };
  },
};

module.exports = catalogService;
