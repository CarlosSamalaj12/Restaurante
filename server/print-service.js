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
          finalPrinter.close((closeErr) => {
            if (closeErr) return fail(new Error(`Error al cerrar conexión: ${closeErr.message || closeErr}`));
            ok();
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

    printer
      .align("ct")
      .style("b")
      .size(1, 1)
      .text(centerName)
      .text("--------------------------------")
      .style("normal")
      .size(0, 0)
      .align("lt");

    if (account?.check_number) printer.text(`Pedido:  ${account.check_number}`);
    if (account?.table_code) printer.text(`Mesa:    ${account.table_code}`);
    if (account?.waiter_name) printer.text(`Mesero:  ${account.waiter_name}`);
    printer.text(`Hora:    ${time}`);
    printer.text("--------------------------------");

    for (const item of ticket.items || []) {
      const name = item.productName || item.product_name || "";
      printer.text(`${item.qty} x ${name}`);
      if (item.notes) printer.text(`   > ${item.notes}`);
      if (Array.isArray(item.modifiers) && item.modifiers.length) {
        for (const mod of item.modifiers) printer.text(`   - ${mod.name}`);
      }
    }

    if (ticket.notes) {
      printer.text("--------------------------------");
      printer.style("b").text(`Notas: ${ticket.notes}`).style("normal");
    }

    printer
      .text("--------------------------------")
      .align("ct")
      .style("b")
      .text(`* ${time} *`)
      .style("normal")
      .text("");

    return printer;
  };
}

function buildCustomerReceipt(receipt, restaurant) {
  return (printer) => {
    const { account = {}, items = [], payments = [], totals = {} } = receipt || {};
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

    if (restaurant?.address) printer.text(restaurant.address);
    if (restaurant?.phone) printer.text(`Tel: ${restaurant.phone}`);
    if (restaurant?.nit) printer.text(`NIT: ${restaurant.nit}`);
    printer.text("================================");

    printer.align("lt");
    if (account.check_number) printer.text(`Cuenta:  ${account.check_number}`);
    if (account.table_code) printer.text(`Mesa:    ${account.table_code}`);
    if (account.waiter_name) printer.text(`Mesero:  ${account.waiter_name}`);
    printer.text(`Fecha:   ${dateStr}`);
    printer.text("--------------------------------");

    for (const item of items) {
      printer.text(`${item.qty} x ${item.product_name}`);
      printer.align("rt").text(`Q ${Number(item.line_total || 0).toFixed(2)}`).align("lt");
    }

    printer.text("--------------------------------");
    if (totals.subtotal !== undefined) {
      printer.text("Subtotal:");
      printer.align("rt").text(`Q ${Number(totals.subtotal).toFixed(2)}`).align("lt");
    }
    if (totals.discount !== undefined && Number(totals.discount) > 0) {
      printer.text("Descuento:");
      printer.align("rt").text(`-Q ${Number(totals.discount).toFixed(2)}`).align("lt");
    }
    if (totals.tax !== undefined && Number(totals.tax) > 0) {
      printer.text("IVA:");
      printer.align("rt").text(`Q ${Number(totals.tax).toFixed(2)}`).align("lt");
    }
    if (totals.tip !== undefined && Number(totals.tip) > 0) {
      printer.text("Propina:");
      printer.align("rt").text(`Q ${Number(totals.tip).toFixed(2)}`).align("lt");
    }
    printer
      .style("b")
      .text("TOTAL:")
      .align("rt")
      .text(`Q ${Number(totals.total || 0).toFixed(2)}`)
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
    const change = totalPaid - Number(totals.total || 0);
    if (change > 0.005) {
      printer.text("Cambio:");
      printer.align("rt").text(`Q ${change.toFixed(2)}`).align("lt");
    }

    printer
      .text("================================")
      .align("ct")
      .style("b")
      .text("Gracias por su visita!")
      .style("normal")
      .text("");

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
      .text("");

    return printer;
  };
}

// ───────── API pública ─────────

/**
 * Imprime un ticket de cocina (comanda).
 * @param {object} ticket - {centerName, items, notes}
 * @param {object} center - {id, name, printer_name, printer_ip, printer_port}
 * @param {object} account - {id, check_number, table_code, waiter_name}
 */
async function printKitchenTicket(ticket, center, account) {
  return printWithRetry(center, "kitchen_ticket", account?.id || null, buildKitchenTicket(ticket, center, account));
}

/**
 * Imprime el recibo del cliente.
 * @param {object} receipt - {account, items, payments, totals}
 * @param {object} terminal - {id, name, printer_name, printer_ip, printer_port}
 * @param {object} restaurant - {name, address, phone, nit}
 */
async function printCustomerReceipt(receipt, terminal, restaurant = {}) {
  return printWithRetry(
    terminal,
    "customer_receipt",
    receipt?.account?.id || null,
    buildCustomerReceipt(receipt, restaurant)
  );
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
