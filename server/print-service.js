// server/print-service.js
// Motor de impresión para SamaPos.
// - Toma un "ticket" (estructura de datos) y lo convierte en bytes ESC/POS.
// - Manda los bytes por TCP a la IP de la impresora (puerto 9100 RAW).
// - Loguea cada intento en la tabla `print_jobs` (éxito/fallo).
// - Si la impresora no responde, devuelve un error claro para que la UI lo muestre.
//
// Diseño:
//   * No bloquea la API: todas las funciones son fire-and-forget salvo `printTestPage`
//     (que sí espera porque el operador quiere ver el resultado del botón "Probar").
//   * Reintentos: 2 intentos con 500ms entre ellos.
//   * Timeout de conexión: 3 segundos (las térmicas de red contestan en <1s).

const { query } = require("../src/db");

// ───────── Configuración ─────────
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const CONNECT_TIMEOUT_MS = 3000;

// Lazy require: si escpos no está disponible (ej. dev sin la lib), no rompemos el server.
let escpos = null;
let Network = null;
try {
  escpos = require("escpos");
  Network = require("escpos-network");
  escpos.Network = Network;
} catch (e) {
  console.warn(
    "[PRINT] Librerías escpos no disponibles — la impresión quedará deshabilitada hasta que se instalen. Detalle:",
    e.message
  );
}

// ───────── Helpers de base de datos ─────────
function nowSql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function logPrintJob({
  target,
  ip,
  port,
  jobType,
  accountId = null,
  status,
  error = null,
  attempts = 0,
  payloadSize = null,
}) {
  try {
    await query(
      `INSERT INTO print_jobs
         (printer_target, printer_ip, printer_port, job_type, account_id, payload_size, status, attempts, error_message, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        target,
        ip || null,
        port || null,
        jobType,
        accountId,
        payloadSize,
        status,
        attempts,
        error,
        status === "pending" ? null : nowSql(),
      ]
    );
  } catch (e) {
    console.error("[PRINT] No pude loguear print_job:", e.message);
  }
}

// ───────── Transporte por red ─────────
function sendToNetworkPrinter(ip, port, builder) {
  return new Promise((resolve, reject) => {
    if (!escpos || !Network) {
      return reject(new Error("Librería escpos no instalada en el servidor"));
    }
    const device = new escpos.Network(ip, Number(port) || 9100, {
      timeout: CONNECT_TIMEOUT_MS,
    });
    const printer = new escpos.Printer(device);
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      try { device.close(() => {}); } catch (_e) {}
      reject(err);
    };
    const ok = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      device.open((openErr) => {
        if (openErr) return fail(new Error(`No se pudo abrir ${ip}:${port} — ${openErr.message || openErr}`));
        try {
          const built = builder(printer);
          const finalPrinter = built && typeof built.close === "function" ? built : printer;
          finalPrinter.flush((flushErr) => {
            if (flushErr) return fail(new Error(`Error al enviar datos a impresora: ${flushErr.message || flushErr}`));
            // Esperar 400ms para permitir que el hardware de la impresora vacíe el buffer y ejecute el corte físico
            setTimeout(() => {
              try {
                if (device.device && typeof device.device.end === "function") {
                  device.device.end();
                } else if (typeof device.close === "function") {
                  device.close(() => {});
                }
              } catch (_) {}
              ok();
            }, 400);
          });
        } catch (builderErr) {
          fail(new Error(`Error construyendo ticket: ${builderErr.message || builderErr}`));
        }
      });
    } catch (e) {
      fail(new Error(`Excepción abriendo device: ${e.message || e}`));
    }
  });
}

async function printWithRetry(target, jobType, accountId, builder) {
  const printerName = target.printer_name || target.name || "UNKNOWN";
  const ip = target.printer_ip;
  const port = target.printer_port || 9100;

  if (!ip) {
    const error = "printer_ip no configurado";
    await logPrintJob({ target: printerName, ip: null, port, jobType, accountId, status: "failed", error, attempts: 0 });
    return { ok: false, error, skipped: true, attempts: 0 };
  }

  let lastError = null;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      await sendToNetworkPrinter(ip, port, builder);
      await logPrintJob({
        target: printerName, ip, port, jobType, accountId, status: "success", attempts: attempt,
      });
      return { ok: true, attempts: attempt };
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  const errorMsg = lastError?.message || "Error desconocido";
  await logPrintJob({
    target: printerName, ip, port, jobType, accountId, status: "failed", error: errorMsg, attempts: RETRY_ATTEMPTS,
  });
  return { ok: false, error: errorMsg, attempts: RETRY_ATTEMPTS };
}

// ───────── Builders de tickets (texto plano → ESC/POS) ─────────
// Cada builder recibe el `printer` de escpos y encadena comandos.
// Devuelve el printer para que sendToNetworkPrinter haga el close.

function buildKitchenTicket(ticket, center, account) {
  return (printer) => {
    const centerName = (center?.name || "COCINA").toUpperCase();
    const now = new Date();
    const time = now.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

    // En tamaño doble (1,1): 80mm tiene ~21-24 cols y 58mm tiene ~16 cols
    const is58mm = String(center?.paper_width || "").toLowerCase().includes("58");
    const divider = is58mm ? "----------------" : "--------------------";

    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(centerName)
      .text(divider)
      .style("normal")
      .align("lt");

    // Mesa y Pedido en letra grande y negrita para visibilidad inmediata en cocina/bar
    if (account?.table_code) {
      printer.style("b").size(1, 1).text(`MESA:   ${account.table_code}`).style("normal");
    }
    if (account?.check_number) {
      printer.style("b").size(1, 1).text(`PEDIDO: #${account.check_number}`).style("normal");
    }
    if (account?.waiter_name) {
      printer.size(1, 1).text(`MESERO: ${account.waiter_name}`);
    }
    printer.size(1, 1).text(`HORA:   ${time}`);
    printer.text(divider);

    // Ítems y Modificadores en letra grande
    for (const item of ticket.items || []) {
      const name = (item.productName || item.product_name || "").toUpperCase();
      printer.style("b").size(1, 1).text(`${item.qty} x ${name}`).style("normal");

      if (item.notes) {
        printer.style("b").size(1, 1).text(`  >> ${item.notes}`).style("normal");
      }
      if (Array.isArray(item.modifiers) && item.modifiers.length) {
        for (const mod of item.modifiers) {
          printer.size(1, 1).text(`  * ${mod.name}`);
        }
      }
      printer.text(""); // Espacio entre platos para facilitar la lectura al chef/barman
    }

    if (ticket.notes) {
      printer.text(divider);
      printer.style("b").size(1, 1).text(`NOTAS:\n${ticket.notes}`).style("normal");
    }

    printer
      .text(divider)
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(`* ${time} *`)
      .style("normal")
      .size(0, 0)
      .feed(3);

    try {
      // Secuencia universal de corte ESC/POS:
      // 1. Full cut estándar (\x1DV\x00) soportado por el 99.9% de impresoras térmicas
      if (typeof printer.cut === "function") {
        printer.cut(); // Ejecuta feed y \x1DV\x00
      } else {
        printer.raw(Buffer.from([0x1d, 0x56, 0x00]));
      }
      // 2. Compatibilidad adicional con impresoras que requieren comando Function B (\x1DV\x42\x00)
      printer.raw(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
    } catch (_) {}

    return printer;
  };
}

function buildCustomerReceipt(receipt, restaurant) {
  return (printer) => {
    const { account = {}, items = [], payments = [], totals = {}, felInvoice = null } = receipt || {};
    const restName = restaurant?.name || "RESTAURANTE";
    const now = new Date();
    const dateStr = now.toLocaleString("es-GT");

    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(restName)
      .style("normal")
      .size(0, 0);

    if (restaurant?.commercial_name && restaurant.commercial_name !== restName) {
      printer.text(restaurant.commercial_name);
    }
    if (restaurant?.address) printer.text(restaurant.address);
    if (restaurant?.phone) printer.text(`Tel: ${restaurant.phone}`);
    if (restaurant?.nit || felInvoice?.issuer_nit) {
      printer.text(`NIT: ${restaurant.nit || felInvoice?.issuer_nit}`);
    }
    if (restaurant?.establishment_code) {
      printer.text(`Establecimiento SAT: ${restaurant.establishment_code}`);
    }
    printer.text("================================");

    // Si tiene factura electrónica certificada (FEL SAT)
    if (felInvoice && felInvoice.uuid) {
      printer
        .align("ct")
        .style("b")
        .text("FACTURA ELECTRONICA (FEL)")
        .text("DOCUMENTO TRIBUTARIO ELECTRONICO")
        .style("normal")
        .text("--------------------------------")
        .align("lt")
        .text("AUTORIZACION (UUID):")
        .style("b")
        .text(felInvoice.uuid)
        .style("normal")
        .text(`SERIE: ${felInvoice.serie}   NUMERO: ${felInvoice.dte_number}`)
        .text(`FECHA CERT: ${new Date(felInvoice.certified_at).toLocaleString("es-GT")}`)
        .text(`CERTIFICADOR: ${String(felInvoice.certifier || "SAT").toUpperCase()}`)
        .text("--------------------------------")
        .style("b")
        .text("DATOS DEL RECEPTOR / CLIENTE:")
        .style("normal")
        .text(`NIT/CUI:   ${felInvoice.recipient_nit || "CF"}`)
        .text(`NOMBRE:    ${felInvoice.recipient_name || "CONSUMIDOR FINAL"}`)
        .text(`DIRECCION: ${felInvoice.recipient_address || "CIUDAD"}`)
        .text("--------------------------------");
    }

    printer.align("lt");
    if (account.check_number) printer.text(`Cuenta:  ${account.check_number}`);
    if (account.table_code) printer.text(`Mesa:    ${account.table_code}`);
    if (account.waiter_name) printer.text(`Mesero:  ${account.waiter_name}`);
    if (!felInvoice) printer.text(`Fecha:   ${dateStr}`);
    printer.text("--------------------------------");

    for (const item of items) {
      printer.text(`${item.qty} x ${item.product_name}`);
      printer.align("rt").text(`Q ${Number(item.line_total || 0).toFixed(2)}`).align("lt");
    }

    printer.text("--------------------------------");
    const totalAmount = Number(totals.total || felInvoice?.total_amount || 0);
    const netAmount = felInvoice?.net_amount ? Number(felInvoice.net_amount) : Math.round((totalAmount / 1.12) * 100) / 100;
    const taxAmount = felInvoice?.tax_amount ? Number(felInvoice.tax_amount) : Math.round((totalAmount - netAmount) * 100) / 100;

    if (felInvoice) {
      printer.text("Subtotal sin IVA:");
      printer.align("rt").text(`Q ${netAmount.toFixed(2)}`).align("lt");
      printer.text("IVA (12% SAT):");
      printer.align("rt").text(`Q ${taxAmount.toFixed(2)}`).align("lt");
    } else {
      if (totals.subtotal !== undefined) {
        printer.text("Subtotal:");
        printer.align("rt").text(`Q ${Number(totals.subtotal).toFixed(2)}`).align("lt");
      }
    }

    if (totals.discount !== undefined && Number(totals.discount) > 0) {
      printer.text("Descuento:");
      printer.align("rt").text(`-Q ${Number(totals.discount).toFixed(2)}`).align("lt");
    }
    if (totals.tip !== undefined && Number(totals.tip) > 0) {
      printer.text("Propina:");
      printer.align("rt").text(`Q ${Number(totals.tip).toFixed(2)}`).align("lt");
    }

    printer
      .style("b")
      .text("TOTAL:")
      .align("rt")
      .text(`Q ${totalAmount.toFixed(2)}`)
      .align("lt")
      .style("normal");
    printer.text("--------------------------------");

    let totalPaid = 0;
    for (const p of payments) {
      const methodLabel = p.method_label || p.method;
      printer.text(`${methodLabel}:`);
      printer.align("rt").text(`Q ${Number(p.amount).toFixed(2)}`).align("lt");
      totalPaid += Number(p.amount || 0);
    }
    const change = totalPaid - totalAmount;
    if (change > 0.005) {
      printer.text("Cambio:");
      printer.align("rt").text(`Q ${change.toFixed(2)}`).align("lt");
    }

    // Frases SAT y QR si es FEL
    if (felInvoice) {
      printer
        .text("================================")
        .align("ct")
        .text("SUJETO A PAGOS TRIMESTRALES ISR")
        .text("DOCUMENTO TRIBUTARIO ELECTRONICO");

      if (felInvoice.qr_data) {
        printer.text("--------------------------------");
        try {
          if (typeof printer.qrcode === "function") {
            printer.qrcode(felInvoice.qr_data, 1, 6, "L");
          } else {
            printer.text("Verifique su factura en:");
            printer.text(felInvoice.qr_data);
          }
        } catch (qrErr) {
          printer.text("Verifique su factura en:");
          printer.text(felInvoice.qr_data);
        }
      }
    }

    printer
      .text("================================")
      .align("ct")
      .style("b")
      .text("Gracias por su visita!")
      .style("normal")
      .feed(3);

    try {
      if (typeof printer.cut === "function") {
        printer.cut();
      } else {
        printer.raw(Buffer.from([0x1d, 0x56, 0x00]));
      }
      printer.raw(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
    } catch (_) {}

    return printer;
  };
}

function buildTestPage(target) {
  return (printer) => {
    const now = new Date().toLocaleString("es-GT");
    const name = target.printer_name || target.name || "N/A";
    const ip = target.printer_ip || "N/A";
    const port = target.printer_port || 9100;

    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text("PRUEBA DE IMPRESION")
      .style("normal")
      .size(0, 0)
      .text("================================")
      .align("lt")
      .text(`Impresora: ${name}`)
      .text(`IP:        ${ip}:${port}`)
      .text(`Fecha:     ${now}`)
      .text("================================")
      .text("Si lees este mensaje,")
      .text("la conexion con la impresora")
      .text("es correcta.")
      .align("ct")
      .text("--- SamaPos test page ---")
      .feed(3);

    try {
      if (typeof printer.cut === "function") {
        printer.cut();
      } else {
        printer.raw(Buffer.from([0x1d, 0x56, 0x00]));
      }
      printer.raw(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
    } catch (_) {}

    return printer;
  };
}

// ───────── API pública ─────────

/**
 * Imprime un ticket de cocina (comanda) con soporte de múltiples copias.
 * @param {object} ticket - {centerName, items, notes}
 * @param {object} center - {id, name, printer_name, printer_ip, printer_port}
 * @param {object} account - {id, check_number, table_code, waiter_name}
 * @param {object} options - {copies}
 */
async function printKitchenTicket(ticket, center, account, options = {}) {
  const copies = Number(options.copies || 1);
  let lastRes = { ok: false };
  for (let c = 0; c < Math.max(1, copies); c++) {
    lastRes = await printWithRetry(center, "kitchen_ticket", account?.id || null, buildKitchenTicket(ticket, center, account));
  }
  return lastRes;
}

/**
 * Imprime el recibo del cliente con soporte de copias y DTE SAT.
 * @param {object} receipt - {account, items, payments, totals, felInvoice}
 * @param {object} terminal - {id, name, printer_name, printer_ip, printer_port}
 * @param {object} restaurant - {name, address, phone, nit}
 * @param {object} options - {copies}
 */
async function printCustomerReceipt(receipt, terminal, restaurant = {}, options = {}) {
  const copies = Number(options.copies || receipt?.copies || 1);
  let lastRes = { ok: false };
  for (let c = 0; c < Math.max(1, copies); c++) {
    lastRes = await printWithRetry(
      terminal,
      "customer_receipt",
      receipt?.account?.id || null,
      buildCustomerReceipt(receipt, restaurant)
    );
  }
  return lastRes;
}

/**
 * Imprime una página de prueba (botón "Probar" en Settings).
 * @param {object} target - {printer_name, printer_ip, printer_port}
 */
async function printTestPage(target) {
  return printWithRetry(target, "test", null, buildTestPage(target));
}

/**
 * Devuelve info de diagnóstico (útil para el panel admin).
 */
function getStatus() {
  return {
    escposAvailable: !!(escpos && Network),
    retryAttempts: RETRY_ATTEMPTS,
    retryDelayMs: RETRY_DELAY_MS,
    connectTimeoutMs: CONNECT_TIMEOUT_MS,
  };
}

module.exports = {
  printKitchenTicket,
  printCustomerReceipt,
  printTestPage,
  getStatus,
};
