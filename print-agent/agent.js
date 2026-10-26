// print-agent/agent.js
// SamaPos Print Agent - Agente de impresión térmica para red local (LAN)

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { io } = require("socket.io-client");
const net = require("net");
const { buildKitchenTicket, buildCustomerReceipt, buildTestPage } = require("./builders");

// ───────── Bloqueo de Instancia Única ─────────
// Evita que se abran múltiples agentes en la misma computadora que dupliquen tickets
const LOCK_PORT = 29199;
const lockServer = net.createServer();
lockServer.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn("\n=======================================================");
    console.warn("  [AVISO] Ya hay una instancia de SamaPos Print Agent activa");
    console.warn("  en esta computadora. Esta nueva instancia se cerrará.");
    console.warn("=======================================================\n");
    process.exit(0);
  }
});
lockServer.listen(LOCK_PORT, "127.0.0.1");

// ───────── Cargar Configuración ─────────
const configPath = path.join(__dirname, "config.json");
let config = {
  serverUrl: process.env.SAMAPOS_SERVER_URL || "http://localhost:3000",
  agentSecret: process.env.PRINT_AGENT_SECRET || "samapos_print_secret_2026",
  agentName: process.env.PRINT_AGENT_NAME || "Caja Principal - Restaurante",
  agentId: process.env.PRINT_AGENT_ID || "caja-pos-1",
  pollIntervalMs: 15000,
  connectTimeoutMs: 3500,
  retryAttempts: 2,
  retryDelayMs: 600,
};

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    config = { ...config, ...JSON.parse(raw) };
  } catch (err) {
    console.warn("[CONFIG] No se pudo leer config.json, usando valores por defecto:", err.message);
  }
}

// ───────── Cargar Drivers ESC/POS ─────────
let escpos = null;
let Network = null;
try {
  escpos = require("escpos");
  Network = require("escpos-network");
  escpos.Network = Network;
} catch (e) {
  console.error("[ERROR CRÍTICO] Librería escpos o escpos-network no encontrada.");
  console.error("Ejecute 'npm install' en la carpeta print-agent para instalar dependencias.");
  process.exit(1);
}

// ───────── Cola Serializada de Trabajos ─────────
const jobQueue = [];
const processedJobIds = new Set();
let isProcessingQueue = false;

function enqueueJob(job) {
  if (!job) return;
  const id = Number(job.jobId) || Date.now();
  job.jobId = id;

  // Si ya se procesó o se está procesando, ignorar inmediatamente
  if (processedJobIds.has(id)) return;

  // Si ya está esperando en cola, ignorar
  const exists = jobQueue.some((q) => Number(q.jobId) === id);
  if (exists) return;

  // Registrar de inmediato en el Set para blindar contra cualquier llegada concurrente
  processedJobIds.add(id);

  if (job.jobType === "test") {
    jobQueue.unshift(job);
  } else {
    jobQueue.push(job);
  }
  processQueue();
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    try {
      await executePrintJob(job);
      processedJobIds.add(Number(job.jobId));
      // Mantener set acotado a los últimos 500 IDs
      if (processedJobIds.size > 500) {
        const oldest = Array.from(processedJobIds).slice(0, 100);
        oldest.forEach((id) => processedJobIds.delete(id));
      }
    } catch (err) {
      console.error(`[COLA] Excepción procesando trabajo #${job.jobId}:`, err.message);
    }
  }

  isProcessingQueue = false;
}

// ───────── Envío Directo a la Impresora Térmica en LAN ─────────
function sendToThermalPrinter(ip, port, builder) {
  return new Promise((resolve, reject) => {
    const device = new escpos.Network(ip, Number(port) || 9100, {
      timeout: Number(config.connectTimeoutMs) || 3500,
    });
    const printer = new escpos.Printer(device);
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      try { device.close(() => {}); } catch (_) {}
      reject(err);
    };

    const ok = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    try {
      device.open((openErr) => {
        if (openErr) {
          return fail(new Error(`No se pudo conectar a la impresora ${ip}:${port} — ${openErr.message || openErr}`));
        }
        try {
          const built = builder(printer);
          const finalPrinter = built && typeof built.close === "function" ? built : printer;

          finalPrinter.flush((flushErr) => {
            if (flushErr) {
              return fail(new Error(`Error enviando datos a ${ip}:${port} — ${flushErr.message || flushErr}`));
            }
            // Esperar 400ms para permitir vaciado del búfer de la impresora y corte de guillotina
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
          fail(new Error(`Error construyendo ticket ESC/POS: ${builderErr.message || builderErr}`));
        }
      });
    } catch (ex) {
      fail(new Error(`Excepción abriendo socket a la impresora: ${ex.message || ex}`));
    }
  });
}

async function executePrintJob(job) {
  const { jobId, jobType, printerTarget, printerIp, printerPort, payloadData } = job;
  const targetIp = printerIp;
  const targetPort = printerPort || 9100;

  console.log(`\n--------------------------------------------------`);
  console.log(`[IMPRESIÓN] Procesando trabajo #${jobId} (${jobType}) -> ${printerTarget} (${targetIp}:${targetPort})`);

  if (!targetIp) {
    const err = "Impresora sin dirección IP asignada";
    console.error(`[ERROR] Trabajo #${jobId} cancelado: ${err}`);
    await sendAck(jobId, "failed", err);
    return;
  }

  // Seleccionar generador de ticket
  let builder = null;
  const payload = payloadData || {};

  if (jobType === "kitchen_ticket") {
    builder = buildKitchenTicket(
      payload.ticket || {},
      payload.center || { name: printerTarget, printer_ip: targetIp, printer_port: targetPort },
      payload.account || {},
      payload.copyInfo || null
    );
  } else if (jobType === "customer_receipt") {
    builder = buildCustomerReceipt(
      payload.receipt || {},
      payload.restaurant || {},
      payload.copyInfo || null
    );
  } else if (jobType === "test") {
    builder = buildTestPage(
      payload.target || {
        printer_name: printerTarget,
        printer_ip: targetIp,
        printer_port: targetPort,
      }
    );
  } else {
    // Si no coincide, intentar comanda por defecto si hay items o recibo
    if (payload.ticket) {
      builder = buildKitchenTicket(payload.ticket, payload.center, payload.account, payload.copyInfo);
    } else {
      builder = buildTestPage({ printer_name: printerTarget, printer_ip: targetIp, printer_port: targetPort });
    }
  }

  // Intentos con reintento
  let lastError = null;
  const maxAttempts = Number(config.retryAttempts) || 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[LAN] Enviando datos a ${targetIp}:${targetPort} (Intento ${attempt}/${maxAttempts})...`);
      await sendToThermalPrinter(targetIp, targetPort, builder);
      console.log(`[ÉXITO] ¡Ticket #${jobId} impreso correctamente en ${printerTarget}!`);
      await sendAck(jobId, "success");
      return;
    } catch (e) {
      lastError = e;
      console.warn(`[FALLO TEMPORAL] Intento ${attempt} falló: ${e.message}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, Number(config.retryDelayMs) || 600));
      }
    }
  }

  const finalError = lastError?.message || "Fallo de conexión con la impresora";
  console.error(`[FALLO DEFINITIVO] No se pudo imprimir trabajo #${jobId}: ${finalError}`);
  await sendAck(jobId, "failed", finalError);
}

// ───────── Enviar ACK (Confirmación) al Servidor ─────────
async function sendAck(jobId, status, errorMessage = null) {
  // 1. Intentar por WebSocket si está conectado
  if (socket && socket.connected) {
    socket.emit("print:ack", { jobId, status, errorMessage });
    return;
  }

  // 2. Fallback HTTP si el WebSocket no está conectado
  try {
    const url = new URL("/api/print-agent/ack", config.serverUrl);
    const bodyData = JSON.stringify({ jobId, status, errorMessage });
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const req = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyData),
          "x-print-agent-secret": config.agentSecret,
        },
        timeout: 5000,
      },
      (res) => {
        res.resume(); // Consumir respuesta
      }
    );

    req.on("error", (e) => {
      console.warn(`[ACK HTTP] No pude enviar ACK por HTTP para #${jobId}:`, e.message);
    });

    req.write(bodyData);
    req.end();
  } catch (err) {
    console.warn(`[ACK] Error enviando ACK:`, err.message);
  }
}

// ───────── Polling de Respaldo (HTTP Poller) ─────────
async function pollPendingJobs() {
  try {
    const url = new URL("/api/print-agent/pending?limit=20", config.serverUrl);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const req = transport.request(
      url,
      {
        method: "GET",
        headers: {
          "x-print-agent-secret": config.agentSecret,
        },
        timeout: 7000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(raw);
              if (Array.isArray(data.jobs) && data.jobs.length > 0) {
                console.log(`[POLLER] Se encontraron ${data.jobs.length} trabajos pendientes en cola.`);
                for (const job of data.jobs) {
                  enqueueJob(job);
                }
              }
            } catch (_) {}
          }
        });
      }
    );

    req.on("error", () => {
      // Silencioso en caso de caída temporal de red
    });

    req.end();
  } catch (_) {}
}

// ───────── Cliente Socket.IO ─────────
console.log("======================================================");
console.log("       SAMAPOS PRINT AGENT - PUENTE DE RED LAN        ");
console.log("======================================================");
console.log(`Servidor POS:  ${config.serverUrl}`);
console.log(`Nombre Agente: ${config.agentName} (${config.agentId})`);
console.log(`Estado:        Iniciando conexión WebSocket...`);
console.log("======================================================\n");

const socket = io(config.serverUrl, {
  auth: {
    token: config.agentSecret,
    agentName: config.agentName,
    agentId: config.agentId,
  },
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 10000,
});

socket.on("connect", () => {
  console.log(`\n>>> [ONLINE] Conectado exitosamente al servidor SamaPos (${config.serverUrl})`);
  console.log(`>>> Listo para recibir comandas y recibos en tiempo real.\n`);
  // Buscar trabajos pendientes de inmediato (por si se perdieron mientras estaba offline)
  pollPendingJobs();
});

socket.on("print_agent:registered", (data) => {
  console.log(`[REGISTRO] Agente registrado con éxito en el servidor. Hora server: ${data.serverTime}`);
});

socket.on("print_agent:error", (data) => {
  console.error(`[ERROR AUTORIZACIÓN] El servidor rechazó la conexión: ${data?.message}`);
  console.error(`Verifique que 'agentSecret' en config.json coincida con PRINT_AGENT_SECRET del servidor.`);
});

socket.on("print:new_job", (job) => {
  console.log(`[EVENTO] Nuevo trabajo recibido vía Socket.IO: #${job.jobId} (${job.jobType})`);
  enqueueJob(job);
});

socket.on("disconnect", (reason) => {
  console.warn(`[DESCONECTADO] Conexión perdida con el servidor (${reason}). Reintentando automáticamente...`);
});

socket.on("connect_error", (err) => {
  console.warn(`[RECONECTANDO] No se pudo conectar a ${config.serverUrl}: ${err.message}`);
});

// Iniciar chequeo periódico como respaldo (failsafe solo si el WebSocket está desconectado)
const pollInterval = Math.max(Number(config.pollIntervalMs) || 20000, 10000);
setInterval(() => {
  if (!socket || !socket.connected) {
    pollPendingJobs();
  }
}, pollInterval);

// Cierre limpio
process.on("SIGINT", () => {
  console.log("\n[APAGANDO] Deteniendo Print Agent...");
  if (socket) socket.disconnect();
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (socket) socket.disconnect();
  process.exit(0);
});
