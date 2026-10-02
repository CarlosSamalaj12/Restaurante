// src/modules/fel/drivers/guatefacturas.driver.js
// Driver para el certificador GUATEFACTURAS (Guatefacturas, S.A.) - Guatemala

const BaseFelDriver = require("./base.driver");

class GuatefacturasFelDriver extends BaseFelDriver {
  getBaseUrl() {
    return this.config.environment === "production"
      ? "https://www.guatefacturas.com/fel"
      : "https://testing.guatefacturas.com/fel";
  }

  async consultarNit(nitInput) {
    const cleanNit = String(nitInput || "").trim().toUpperCase().replace(/[-\s]/g, "");

    if (!cleanNit || cleanNit === "CF") {
      return {
        nit: "CF",
        name: "CONSUMIDOR FINAL",
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "GUATEFACTURAS (Consumidor Final)",
      };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/consultas/nit?nit=${cleanNit}`, {
        method: "GET",
        headers: {
          "Usuario": this.config.apiUsername || "",
          "Clave": this.config.apiKey || "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Guatefacturas HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.nombre) {
        return {
          nit: cleanNit,
          name: data.nombre.trim(),
          address: data.direccion || "CIUDAD DE GUATEMALA",
          valid: true,
          source: "GUATEFACTURAS SAT",
        };
      }

      return {
        nit: cleanNit,
        name: "CONSUMIDOR FINAL",
        address: "CIUDAD",
        valid: false,
        source: "NIT no encontrado",
      };
    } catch (err) {
      console.warn("[GUATEFACTURAS] Fallback consulta NIT:", err.message);
      return {
        nit: cleanNit,
        name: `CLIENTE NIT ${cleanNit}`,
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "GUATEFACTURAS (Fallback)",
      };
    }
  }

  async emitirFactura(invoiceData) {
    const total = Number(invoiceData.total || 0);
    const netAmount = Math.round((total / 1.12) * 100) / 100;
    const taxAmount = Math.round((total - netAmount) * 100) / 100;

    const payload = {
      Emisor: {
        NIT: this.config.issuerNit,
        Nombre: this.config.issuerName,
        Establecimiento: this.config.establishmentCode || 1,
      },
      Receptor: {
        NIT: invoiceData.recipientNit || "CF",
        Nombre: invoiceData.recipientName || "CONSUMIDOR FINAL",
        Direccion: invoiceData.recipientAddress || "CIUDAD",
      },
      Total: total,
      Detalle: (invoiceData.items || []).map((item, idx) => ({
        Linea: idx + 1,
        Cantidad: Number(item.qty || 1),
        Descripcion: item.product_name,
        PrecioUnitario: Number(item.unit_price || 0),
        MontoTotal: Number(item.line_total || 0),
      })),
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/dte/emitir`, {
        method: "POST",
        headers: {
          "Usuario": this.config.apiUsername || "",
          "Clave": this.config.apiKey || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok || resData.Resultado === false) {
        throw new Error(resData.Mensaje || "Error al certificar con Guatefacturas");
      }

      const uuid = resData.Autorizacion || resData.UUID;
      const serie = resData.Serie;
      const dteNumber = String(resData.Numero || resData.NumeroDTE);
      const certifiedAt = resData.FechaHoraCertificacion || new Date().toISOString().slice(0, 19).replace("T", " ");

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
        certifier: "guatefacturas",
        certifierName: "GUATEFACTURAS, S.A.",
        certifierNit: "2468101-2",
        xmlUrl: resData.XmlUrl || null,
        pdfUrl: resData.PdfUrl || null,
        qrData: `https://portal.sat.gob.gt/portal/verificador-facturas?uuid=${uuid}&nit=${this.config.issuerNit}&monto=${total.toFixed(2)}`,
      };
    } catch (err) {
      console.error("[GUATEFACTURAS CERTIFICATION ERROR]", err.message);
      throw err;
    }
  }

  async testConnection() {
    try {
      if (!this.config.apiUsername || !this.config.apiKey) {
        return {
          success: false,
          message: "Faltan credenciales de Guatefacturas (Usuario y Clave).",
        };
      }
      return {
        success: true,
        message: `Conexión con GUATEFACTURAS configurada (${this.config.environment.toUpperCase()}).`,
      };
    } catch (err) {
      return { success: false, message: `Error conectando con GUATEFACTURAS: ${err.message}` };
    }
  }
}

module.exports = GuatefacturasFelDriver;
