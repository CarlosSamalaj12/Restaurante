// src/modules/fel/drivers/digifact.driver.js
// Driver para el certificador DIGIFACT (Digifact Servicios, S.A.) - Guatemala

const BaseFelDriver = require("./base.driver");

class DigifactFelDriver extends BaseFelDriver {
  getBaseUrl() {
    return this.config.environment === "production"
      ? "https://felgtaws.digifact.com.gt/gt.com.efactura"
      : "https://felgttestaws.digifact.com.gt/gt.com.efactura";
  }

  async getAuthToken() {
    // Si ya tiene un token directo configurado
    if (this.config.apiToken) {
      return this.config.apiToken;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/login/get_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Username: this.config.apiUsername,
          Password: this.config.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Digifact Login Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.Token || data.token;
    } catch (e) {
      console.warn("[DIGIFACT] Error obteniendo token:", e.message);
      return null;
    }
  }

  async consultarNit(nitInput) {
    const cleanNit = String(nitInput || "").trim().toUpperCase().replace(/[-\s]/g, "");

    if (!cleanNit || cleanNit === "CF") {
      return {
        nit: "CF",
        name: "CONSUMIDOR FINAL",
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "DIGIFACT (Consumidor Final)",
      };
    }

    try {
      const token = await this.getAuthToken();
      const nitEmisor = this.config.issuerNit || "";

      const response = await fetch(`${this.getBaseUrl()}/v2/contribuyente/${cleanNit}?nit_emisor=${nitEmisor}`, {
        method: "GET",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Digifact NIT Query error: ${response.status}`);
      }

      const data = await response.json();
      if (data && (data.nombre || data.Nombre)) {
        return {
          nit: cleanNit,
          name: (data.nombre || data.Nombre).trim(),
          address: data.direccion || data.Direccion || "CIUDAD DE GUATEMALA",
          valid: true,
          source: "DIGIFACT SAT",
        };
      }

      return {
        nit: cleanNit,
        name: "CONSUMIDOR FINAL",
        address: "CIUDAD",
        valid: false,
        source: "NIT no encontrado en SAT",
      };
    } catch (err) {
      console.warn("[DIGIFACT] Fallback consulta NIT:", err.message);
      return {
        nit: cleanNit,
        name: `CLIENTE NIT ${cleanNit}`,
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "DIGIFACT (Offline/Fallback)",
      };
    }
  }

  async emitirFactura(invoiceData) {
    const total = Number(invoiceData.total || 0);
    const netAmount = Math.round((total / 1.12) * 100) / 100;
    const taxAmount = Math.round((total - netAmount) * 100) / 100;

    const token = await this.getAuthToken();
    const payload = {
      NITEmisor: this.config.issuerNit,
      NombreEmisor: this.config.issuerName,
      CodigoEstablecimiento: this.config.establishmentCode || 1,
      TipoDocumento: "FACT",
      Receptor: {
        NITReceptor: invoiceData.recipientNit || "CF",
        NombreReceptor: invoiceData.recipientName || "CONSUMIDOR FINAL",
        DireccionReceptor: invoiceData.recipientAddress || "CIUDAD",
      },
      Frases: [{ TipoFrase: this.config.satPhraseType || 1, CodigoEscenario: this.config.satPhraseCode || 1 }],
      Items: (invoiceData.items || []).map((item, idx) => ({
        NumeroLinea: idx + 1,
        Cantidad: Number(item.qty || 1),
        Descripcion: item.product_name,
        PrecioUnitario: Number(item.unit_price || 0),
        Precio: Number(item.line_total || 0),
        Descuento: 0,
        Total: Number(item.line_total || 0),
      })),
      Total: total,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/v2/dte/certificar`, {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok || resData.Codigo !== 1) {
        throw new Error(resData.Mensaje || "Error al certificar con Digifact");
      }

      const uuid = resData.Autorizacion || resData.UUID;
      const serie = resData.Serie;
      const dteNumber = String(resData.NUMERO || resData.Numero);
      const certifiedAt = resData.FechaCertificacion || new Date().toISOString().slice(0, 19).replace("T", " ");

      return {
        success: true,
        uuid,
        serie,
        dteNumber,
        certifiedAt,
        recipientNit: invoiceData.recipientNit,
        recipientName: invoiceData.recipientName,
        recipientAddress: invoiceData.recipientAddress,
        totalAmount: total,
        netAmount,
        taxAmount,
        certifier: "digifact",
        certifierName: "DIGIFACT SERVICIOS, S.A.",
        certifierNit: "7745432-1",
        xmlUrl: resData.XmlUrl || null,
        pdfUrl: resData.PdfUrl || null,
        qrData: `https://portal.sat.gob.gt/portal/verificador-facturas?uuid=${uuid}&nit=${this.config.issuerNit}&monto=${total.toFixed(2)}`,
      };
    } catch (err) {
      console.error("[DIGIFACT CERTIFICATION ERROR]", err.message);
      throw err;
    }
  }

  async testConnection() {
    try {
      if (!this.config.apiUsername || (!this.config.apiKey && !this.config.apiToken)) {
        return {
          success: false,
          message: "Faltan credenciales de Digifact (Usuario y Contraseña/Token).",
        };
      }
      const token = await this.getAuthToken();
      if (!token) {
        return { success: false, message: "No se pudo autenticar con Digifact. Verifica usuario y contraseña." };
      }
      return {
        success: true,
        message: `Conexión con DIGIFACT exitosa (${this.config.environment.toUpperCase()}).`,
      };
    } catch (err) {
      return { success: false, message: `Error conectando con DIGIFACT: ${err.message}` };
    }
  }
}

module.exports = DigifactFelDriver;
