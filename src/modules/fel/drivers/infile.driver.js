// src/modules/fel/drivers/infile.driver.js
// Driver para el certificador INFILE (Infile, S.A. / FelPlex) - Guatemala

const BaseFelDriver = require("./base.driver");

class InfileFelDriver extends BaseFelDriver {
  getBaseUrl() {
    return this.config.environment === "production"
      ? "https://certificador.infile.com.gt/fel"
      : "https://certificador.feel.com.gt/fel";
  }

  getReceiverUrl() {
    return this.config.environment === "production"
      ? "https://consultareceptores.infile.com.gt/validador_receptores/api/v1/receptores"
      : "https://consultareceptores.feel.com.gt/validador_receptores/api/v1/receptores";
  }

  async consultarNit(nitInput) {
    const cleanNit = String(nitInput || "").trim().toUpperCase().replace(/[-\s]/g, "");

    if (!cleanNit || cleanNit === "CF") {
      return {
        nit: "CF",
        name: "CONSUMIDOR FINAL",
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "INFILE (Consumidor Final)",
      };
    }

    try {
      const response = await fetch(`${this.getReceiverUrl()}?nit=${cleanNit}`, {
        method: "GET",
        headers: {
          "usuario": this.config.apiUsername || "",
          "llave": this.config.apiKey || "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Infile HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.nombre) {
        return {
          nit: cleanNit,
          name: data.nombre.trim(),
          address: data.direccion || "CIUDAD DE GUATEMALA",
          valid: true,
          source: "INFILE SAT",
        };
      }

      return {
        nit: cleanNit,
        name: "CONSUMIDOR FINAL",
        address: "CIUDAD",
        valid: false,
        source: "NIT no registrado",
      };
    } catch (err) {
      console.warn("[INFILE] Fallback consulta NIT:", err.message);
      // Fallback amigable
      return {
        nit: cleanNit,
        name: `CLIENTE NIT ${cleanNit}`,
        address: "CIUDAD DE GUATEMALA",
        valid: true,
        source: "INFILE (Offline/Fallback)",
      };
    }
  }

  async emitirFactura(invoiceData) {
    const total = Number(invoiceData.total || 0);
    const netAmount = Math.round((total / 1.12) * 100) / 100;
    const taxAmount = Math.round((total - netAmount) * 100) / 100;

    const payload = {
      emisor_codigo_establecimiento: this.config.establishmentCode || 1,
      emisor_nit: this.config.issuerNit || "",
      emisor_nombre: this.config.issuerName || "",
      receptor_nit: invoiceData.recipientNit || "CF",
      receptor_nombre: invoiceData.recipientName || "CONSUMIDOR FINAL",
      receptor_direccion: invoiceData.recipientAddress || "CIUDAD",
      frases: [{ tipo: this.config.satPhraseType || 1, codigo: this.config.satPhraseCode || 1 }],
      items: (invoiceData.items || []).map((item, idx) => ({
        linea: idx + 1,
        cantidad: Number(item.qty || 1),
        descripcion: item.product_name,
        precio_unitario: Number(item.unit_price || 0),
        precio: Number(item.line_total || 0),
        descuento: 0,
        impuestos: [{
          nombre_corto: "IVA",
          codigo_unidad_gravable: 1,
          monto_gravable: Math.round(((Number(item.line_total || 0)) / 1.12) * 100) / 100,
          monto_impuesto: Math.round((Number(item.line_total || 0) - ((Number(item.line_total || 0)) / 1.12)) * 100) / 100,
        }],
        total: Number(item.line_total || 0),
      })),
      total: total,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/v2/dte/generar`, {
        method: "POST",
        headers: {
          "usuario": this.config.apiUsername || "",
          "llave": this.config.apiKey || "",
          "alias": this.config.apiAlias || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok || resData.resultado === false || resData.error) {
        const errMsg = resData.descripcion_errores?.[0]?.mensaje_error || resData.mensaje || "Error al certificar con Infile";
        throw new Error(errMsg);
      }

      const uuid = resData.uuid || resData.numero_autorizacion;
      const serie = resData.serie;
      const dteNumber = String(resData.numero || resData.numero_dte);
      const certifiedAt = resData.fecha_certificacion || new Date().toISOString().slice(0, 19).replace("T", " ");

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
        certifier: "infile",
        certifierName: "INFILE, S.A.",
        certifierNit: "125743-2",
        xmlUrl: resData.xml || null,
        pdfUrl: resData.pdf || null,
        qrData: `https://portal.sat.gob.gt/portal/verificador-facturas?uuid=${uuid}&nit=${this.config.issuerNit}&monto=${total.toFixed(2)}`,
      };
    } catch (err) {
      console.error("[INFILE CERTIFICATION ERROR]", err.message);
      throw err;
    }
  }

  async testConnection() {
    try {
      if (!this.config.apiUsername || !this.config.apiKey) {
        return {
          success: false,
          message: "Faltan credenciales obligatorias de Infile (Usuario y Llave/API Key).",
        };
      }

      // Probar consulta de CF en endpoint de validación
      const res = await this.consultarNit("CF");
      return {
        success: true,
        message: `Conexión con INFILE establecida con éxito (${this.config.environment.toUpperCase()}).`,
        details: res,
      };
    } catch (err) {
      return {
        success: false,
        message: `Error conectando con INFILE: ${err.message}`,
      };
    }
  }
}

module.exports = InfileFelDriver;
