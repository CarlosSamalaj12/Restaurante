// src/modules/fel/drivers/base.driver.js
// Clase base para adaptadores de certificadores DTE (SAT Guatemala)

class BaseFelDriver {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Consulta el NIT / CUI ante el certificador o SAT
   * @param {string} nit
   * @returns {Promise<{ nit: string, name: string, address: string, valid: boolean }>}
   */
  async consultarNit(nit) {
    throw new Error("consultarNit no implementado en driver");
  }

  /**
   * Emite y certifica el DTE
   * @param {object} invoiceData
   * @returns {Promise<object>}
   */
  async emitirFactura(invoiceData) {
    throw new Error("emitirFactura no implementado en driver");
  }

  /**
   * Anula un DTE previamente certificado
   * @param {object} voidData
   * @returns {Promise<object>}
   */
  async anularFactura(voidData) {
    throw new Error("anularFactura no implementado en driver");
  }

  /**
   * Prueba la conexión y credenciales con el certificador
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async testConnection() {
    throw new Error("testConnection no implementado en driver");
  }
}

module.exports = BaseFelDriver;
