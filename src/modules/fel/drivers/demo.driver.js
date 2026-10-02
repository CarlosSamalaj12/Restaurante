// src/modules/fel/drivers/demo.driver.js
// Simulador de certificación DTE para pruebas locales y desarrollo (SAT Guatemala)

const crypto = require("crypto");
const BaseFelDriver = require("./base.driver");

const MOCK_NITS = {
  "CF": { name: "CONSUMIDOR FINAL", address: "CIUDAD DE GUATEMALA" },
  "C/F": { name: "CONSUMIDOR FINAL", address: "CIUDAD DE GUATEMALA" },
  "12345678": { name: "CORPORACION GASTRONOMICA DE GUATEMALA, S.A.", address: "ZONA 10, CIUDAD DE GUATEMALA" },
  "76543210": { name: "DISTRIBUIDORA DE ALIMENTOS CENTRAL, S.A.", address: "ZONA 1, GUATEMALA" },
  "98765432": { name: "SERVICIOS EMPRESARIALES DE GUATEMALA", address: "ZONA 4, GUATEMALA" },
  "88991122": { name: "JUAN CARLOS PEREZ LOPEZ", address: "ZONA 11, CIUDAD DE GUATEMALA" },
  "55443322": { name: "MARIA FERNANDA RODRIGUEZ", address: "ZONA 14, GUATEMALA" }
};

class DemoFelDriver extends BaseFelDriver {
  async consultarNit(nitInput) {
    const cleanNit = String(nitInput || "").trim().toUpperCase().replace(/[-\s]/g, "");

    if (!cleanNit || cleanNit === "CF") {
      return {
        nit: "CF",
        name: "CONSUMIDOR FINAL",
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "DEMO SAT (Consumidor Final)",
      };
    }

    if (MOCK_NITS[cleanNit]) {
      return {
        nit: cleanNit,
        name: MOCK_NITS[cleanNit].name,
        address: MOCK_NITS[cleanNit].address,
        valid: true,
        source: "DEMO SAT (Certificador Simulado)",
      };
    }

    // Si es un NIT numérico o CUI (DPI)
    if (/^\d{5,13}[0-9Kk]?$/.test(cleanNit)) {
      return {
        nit: cleanNit,
        name: `CLIENTE DEMO NIT ${cleanNit}`,
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "DEMO SAT (Auto-generado)",
      };
    }

    return {
      nit: cleanNit,
      name: "CONSUMIDOR FINAL",
      address: "CIUDAD",
      valid: false,
      source: "NIT no encontrado",
    };
  }

  async emitirFactura(invoiceData) {
    const uuid = crypto.randomUUID().toUpperCase();
    const serie = "DEMO" + Math.floor(1000 + Math.random() * 9000);
    const dteNumber = String(Math.floor(100000000 + Math.random() * 900000000));
    const certifiedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    const recipientNit = String(invoiceData.recipientNit || "CF").trim().toUpperCase();
    const recipientName = invoiceData.recipientName || "CONSUMIDOR FINAL";
    const recipientAddress = invoiceData.recipientAddress || "CIUDAD";

    const total = Number(invoiceData.total || 0);
    // IVA 12% incluido en Guatemala: Total / 1.12 = Base, Base * 0.12 = IVA
    const netAmount = Math.round((total / 1.12) * 100) / 100;
    const taxAmount = Math.round((total - netAmount) * 100) / 100;

    const qrData = `https://portal.sat.gob.gt/portal/verificador-facturas?uuid=${uuid}&nit=${invoiceData.issuerNit || "CF"}&monto=${total.toFixed(2)}`;

    return {
      success: true,
      uuid,
      serie,
      dteNumber,
      certifiedAt,
      recipientNit,
      recipientName,
      recipientAddress,
      totalAmount: total,
      netAmount,
      taxAmount,
      certifier: "demo",
      certifierName: "SIMULADOR DTE / SAT DEMO",
      certifierNit: "00000000",
      xmlUrl: `https://fel-demo.sat.gob.gt/xml/${uuid}.xml`,
      pdfUrl: `https://fel-demo.sat.gob.gt/pdf/${uuid}.pdf`,
      qrData,
    };
  }

  async anularFactura(voidData) {
    return {
      success: true,
      uuid: voidData.uuid,
      voidedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      message: "DTE anulado correctamente en Simulador SAT",
    };
  }

  async testConnection() {
    return {
      success: true,
      message: "Conexión exitosa con el Simulador FEL SAT (Ambiente de pruebas activo)",
      environment: this.config.environment || "sandbox",
    };
  }
}

module.exports = DemoFelDriver;
