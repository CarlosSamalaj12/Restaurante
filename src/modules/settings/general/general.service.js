// src/modules/settings/general/general.service.js
// Lógica de negocio para Perfil del Negocio, Branding, Logo/Fondos, Propinas y Bootstrap

const fs = require("fs");
const path = require("path");
const generalRepository = require("./general.repository");
const { BadRequestError } = require("../../../common/errors");

const generalService = {
  // ───────── Bootstrap & Full Settings ─────────
  async getBootstrap(ip) {
    return generalRepository.getBootstrapData(ip);
  },

  async getFullSettings(currentIp) {
    return generalRepository.getFullSettingsData(currentIp);
  },

  async getConfigData() {
    return generalRepository.getConfigData();
  },

  // ───────── Branding & Assets ─────────
  async updateBranding(restaurantName) {
    const name = String(restaurantName || "").trim();
    if (!name) throw new BadRequestError("restaurantName es requerido");
    const trimmed = name.slice(0, 150);

    await generalRepository.updateBusinessProfile({ restaurant_name: trimmed });
    await generalRepository.setAppSetting("restaurant_name", trimmed);
    return { ok: true, restaurantName: trimmed };
  },

  async saveLogo(logoData, baseDir) {
    const raw = String(logoData || "").trim();
    if (!raw) throw new BadRequestError("logoData es requerido");

    const base64Match = raw.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new BadRequestError("Formato de imagen inválido. Usa PNG, JPG, GIF o WebP.");
    }

    const ext = base64Match[1].replace("jpeg", "jpg");
    const fileName = `logo_${Date.now()}.${ext}`;
    const uploadsDir = path.join(baseDir || process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(base64Match[2], "base64");
    fs.writeFileSync(filePath, buffer);

    const logoUrl = `/uploads/${fileName}`;
    await generalRepository.updateBusinessProfile({ logo_url: logoUrl });
    await generalRepository.setAppSetting("logo_url", logoUrl);

    return { ok: true, logoUrl };
  },

  async saveLoginBg(bgData, baseDir) {
    const raw = String(bgData || "").trim();
    if (!raw) throw new BadRequestError("bgData es requerido");

    const base64Match = raw.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new BadRequestError("Formato de imagen inválido. Usa PNG, JPG, GIF o WebP.");
    }

    const ext = base64Match[1].replace("jpeg", "jpg");
    const fileName = `login_bg_${Date.now()}.${ext}`;
    const uploadsDir = path.join(baseDir || process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(base64Match[2], "base64");
    fs.writeFileSync(filePath, buffer);

    const loginBgUrl = `/uploads/${fileName}`;
    await generalRepository.updateBusinessProfile({ login_bg_url: loginBgUrl });
    await generalRepository.setAppSetting("login_bg_url", loginBgUrl);

    return { ok: true, loginBgUrl };
  },

  async saveReceiptLogo(logoData, baseDir) {
    const raw = String(logoData || "").trim();
    if (!raw) {
      await generalRepository.updateBusinessProfile({ receipt_logo_url: null });
      return { ok: true, receiptLogoUrl: null };
    }

    const base64Match = raw.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new BadRequestError("Formato de imagen inválido. Usa PNG, JPG, GIF o WebP.");
    }

    const ext = base64Match[1].replace("jpeg", "jpg");
    const fileName = `receipt_logo_${Date.now()}.${ext}`;
    const uploadsDir = path.join(baseDir || process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(base64Match[2], "base64");
    fs.writeFileSync(filePath, buffer);

    const receiptLogoUrl = `/uploads/${fileName}`;
    await generalRepository.updateBusinessProfile({ receipt_logo_url: receiptLogoUrl });

    return { ok: true, receiptLogoUrl };
  },

  // ───────── Propinas ─────────
  async updateTipConfig(tipPercent) {
    const pct = Number(tipPercent);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      throw new BadRequestError("tipPercent debe estar entre 0 y 100");
    }
    const rounded = Number(pct.toFixed(2));
    await generalRepository.updateBusinessProfile({ tip_percent: rounded });
    await generalRepository.setAppSetting("tip_percent", String(rounded));
    return { ok: true, tipPercent: rounded };
  },

  async getTipPercent() {
    return generalRepository.getTipPercent();
  },

  async getTipExcludedMethods() {
    const excludedMethods = await generalRepository.getTipExcludedMethods();
    return { excludedMethods };
  },

  async updateTipExcludedMethods(excludedMethods = "cxc") {
    const list = Array.isArray(excludedMethods)
      ? excludedMethods.map(String)
      : String(excludedMethods).split(",").map((s) => s.trim()).filter(Boolean);

    await generalRepository.setTipExcludedMethods(list);
    return { ok: true, excludedMethods: list };
  },

  // ───────── Perfil de Negocio ─────────
  async getBusinessProfile() {
    const profile = await generalRepository.getBusinessProfile();
    return profile || {};
  },

  async updateBusinessProfile(data) {
    const {
      restaurant_name,
      business_subtitle,
      phone,
      address,
      tax_id,
      currency_symbol,
      receipt_footer,
      shift_receipt_footer,
      receipt_logo_url,
      tip_percent,
    } = data || {};

    await generalRepository.updateBusinessProfile({
      restaurant_name,
      business_subtitle,
      phone,
      address,
      tax_id,
      currency_symbol,
      receipt_footer,
      shift_receipt_footer,
      receipt_logo_url,
      tip_percent,
    });

    if (restaurant_name) {
      await generalRepository.setAppSetting("restaurant_name", String(restaurant_name).trim().slice(0, 150));
    }
    const updated = await generalRepository.getBusinessProfile();
    return { ok: true, profile: updated };
  },
};

module.exports = generalService;
