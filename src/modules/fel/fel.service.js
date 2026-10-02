// src/modules/fel/fel.service.js
// Servicio principal de facturación electrónica DTE (SAT Guatemala)

const felRepository = require("./fel.repository");
const accountsService = require("../accounts/accounts.service");
const DemoFelDriver = require("./drivers/demo.driver");
const InfileFelDriver = require("./drivers/infile.driver");
const DigifactFelDriver = require("./drivers/digifact.driver");
const GuatefacturasFelDriver = require("./drivers/guatefacturas.driver");
const { BadRequestError, NotFoundError } = require("../../common/errors");

const felService = {
  getDriver(config) {
    const provider = String(config?.provider || "demo").toLowerCase();
    switch (provider) {
      case "infile":
        return new InfileFelDriver(config);
      case "digifact":
        return new DigifactFelDriver(config);
      case "guatefacturas":
        return new GuatefacturasFelDriver(config);
      case "demo":
      default:
        return new DemoFelDriver(config);
    }
  },

  async getConfig() {
    const config = await felRepository.getConfig();
    const paymentMethods = await felRepository.getPaymentMethodsFelRules();

    if (!config) return { is_enabled: 0, provider: "demo", paymentMethods: [] };

    // Enmascarar credenciales sensibles para seguridad en la UI
    const masked = { ...config };
    if (masked.api_key && masked.api_key.length > 4) {
      masked.api_key_masked = "••••••••" + masked.api_key.slice(-4);
    } else if (masked.api_key) {
      masked.api_key_masked = "••••••••";
    }

    if (masked.api_token && masked.api_token.length > 4) {
      masked.api_token_masked = "••••••••" + masked.api_token.slice(-4);
    } else if (masked.api_token) {
      masked.api_token_masked = "••••••••";
    }

    return {
      config: masked,
      paymentMethods,
    };
  },

  async updateConfig(payload) {
    const { config = {}, paymentRules = [] } = payload || {};

    // Si viene api_key o api_token con valor enmascarado (••••••••), no sobrescribir el valor real en BD
    const cleanConfig = { ...config };
    if (cleanConfig.api_key && cleanConfig.api_key.startsWith("••••")) {
      delete cleanConfig.api_key;
    }
    if (cleanConfig.api_token && cleanConfig.api_token.startsWith("••••")) {
      delete cleanConfig.api_token;
    }

    await felRepository.updateConfig(cleanConfig);

    if (Array.isArray(paymentRules)) {
      for (const rule of paymentRules) {
        if (rule.code) {
          await felRepository.updatePaymentMethodFelRule(
            rule.code,
            rule.auto_invoice,
            rule.default_recipient || "CF"
          );
        }
      }
    }

    return this.getConfig();
  },

  async testConnection(customCreds = null) {
    let effectiveConfig = await felRepository.getConfig();
    if (customCreds && typeof customCreds === "object") {
      effectiveConfig = {
        ...effectiveConfig,
        ...customCreds,
      };
      // Preservar llave si vino enmascarada
      if (customCreds.api_key && customCreds.api_key.startsWith("••••")) {
        const stored = await felRepository.getConfig();
        effectiveConfig.api_key = stored?.api_key || "";
      }
    }

    const driver = this.getDriver(effectiveConfig);
    return driver.testConnection();
  },

  async consultarNit(nit) {
    const config = await felRepository.getConfig();
    const driver = this.getDriver(config);
    return driver.consultarNit(nit);
  },

  async emitirFactura({ accountId, recipientNit = "CF", recipientName, recipientAddress, emitirFel = true }) {
    const parsedAccountId = Number(accountId);
    if (!parsedAccountId) throw new BadRequestError("accountId inválido");

    const config = await felRepository.getConfig();
    if (!config?.is_enabled && !emitirFel) {
      return null;
    }

    // Verificar si ya existe una factura válida para esta cuenta
    const existing = await felRepository.findInvoiceByAccountId(parsedAccountId);
    if (existing) {
      return existing;
    }

    const details = await felRepository.getAccountBillingDetails(parsedAccountId);
    if (!details || !details.account) {
      throw new NotFoundError("Cuenta no encontrada para facturar");
    }

    const totals = await accountsService.getAccountTotals(parsedAccountId);
    const total = Number(totals.total || 0);
    if (total <= 0) {
      throw new BadRequestError("La cuenta tiene monto cero o no tiene consumos");
    }

    // Limpieza de datos del receptor
    const cleanNit = String(recipientNit || "CF").trim().toUpperCase().replace(/[-\s]/g, "");
    let finalName = recipientName ? String(recipientName).trim() : "";
    let finalAddress = recipientAddress ? String(recipientAddress).trim() : "CIUDAD";

    if (!finalName || cleanNit === "CF") {
      if (cleanNit === "CF") {
        finalName = "CONSUMIDOR FINAL";
      } else {
        // Consultar nombre automáticamente si no lo enviaron
        try {
          const res = await this.consultarNit(cleanNit);
          finalName = res.name || `CLIENTE NIT ${cleanNit}`;
          if (res.address) finalAddress = res.address;
        } catch (e) {
          finalName = `CLIENTE NIT ${cleanNit}`;
        }
      }
    }

    const invoicePayload = {
      accountId: parsedAccountId,
      issuerNit: config.issuer_nit,
      issuerName: config.issuer_name,
      establishmentCode: config.establishment_code || 1,
      satPhraseType: config.sat_phrase_type || 1,
      satPhraseCode: config.sat_phrase_code || 1,
      recipientNit: cleanNit,
      recipientName: finalName,
      recipientAddress: finalAddress,
      items: details.items || [],
      total: total,
    };

    const driver = this.getDriver(config);
    const dteResult = await driver.emitirFactura(invoicePayload);

    // Guardar en la base de datos
    const invoiceId = await felRepository.insertInvoice({
      accountId: parsedAccountId,
      uuid: dteResult.uuid,
      serie: dteResult.serie,
      dteNumber: dteResult.dteNumber,
      certifiedAt: dteResult.certifiedAt,
      recipientNit: dteResult.recipientNit,
      recipientName: dteResult.recipientName,
      recipientAddress: dteResult.recipientAddress,
      totalAmount: dteResult.totalAmount,
      taxAmount: dteResult.taxAmount,
      netAmount: dteResult.netAmount,
      certifier: dteResult.certifier,
      status: "certified",
      xmlUrl: dteResult.xmlUrl,
      pdfUrl: dteResult.pdfUrl,
      qrData: dteResult.qrData,
    });

    const saved = await felRepository.findInvoiceByUuid(dteResult.uuid);
    return saved;
  },

  async getAccountInvoice(accountId) {
    const parsedAccountId = Number(accountId);
    if (!parsedAccountId) throw new BadRequestError("accountId inválido");
    return felRepository.findInvoiceByAccountId(parsedAccountId);
  }
};

module.exports = felService;
