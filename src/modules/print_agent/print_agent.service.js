// src/modules/print_agent/print_agent.service.js
// Servicio central para coordinación del Print Agent (Cloud to LAN thermal printing)

const { query } = require("../../db");
const { emitEvent, getSocket } = require("../../common/sockets");

const PRINT_AGENT_SECRET = process.env.PRINT_AGENT_SECRET || "samapos_print_secret_2026";

// Almacén en memoria de agentes locales conectados
// Key: socket.id -> Value: { agentId, agentName, ip, connectedAt, lastSeen }
const connectedAgents = new Map();

// Promesas pendientes esperando ACK de un trabajo de impresión (ej. pruebas directas)
const pendingAckResolvers = new Map();

function validateSecret(secret) {
  if (!secret) return false;
  return String(secret).trim() === String(PRINT_AGENT_SECRET).trim();
}

function hasConnectedAgents() {
  return connectedAgents.size > 0;
}

function getConnectedAgentsList() {
  return Array.from(connectedAgents.values());
}

function getStatus() {
  return {
    enabled: true,
    hasConnectedAgents: connectedAgents.size > 0,
    connectedCount: connectedAgents.size,
    agents: getConnectedAgentsList(),
  };
}

function registerAgent(socket, data = {}) {
  const secret =
    data.secret ||
    socket.handshake?.auth?.token ||
    socket.handshake?.headers?.["x-print-agent-secret"];

  if (!validateSecret(secret)) {
    console.warn(`[PRINT AGENT] Intento de conexión no autorizado desde ${socket.handshake?.address}`);
    socket.emit("print_agent:error", { message: "Token de agente no autorizado" });
    socket.disconnect(true);
    return false;
  }

  const agentInfo = {
    socketId: socket.id,
    agentId: data.agentId || socket.handshake?.auth?.agentId || `agent-${socket.id.slice(0, 6)}`,
    agentName: data.agentName || socket.handshake?.auth?.agentName || "Caja / Terminal Local",
    ip: socket.handshake?.address || "127.0.0.1",
    connectedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  connectedAgents.set(socket.id, agentInfo);
  socket.join("room:print-agents");

  console.log(`[PRINT AGENT] Agente "${agentInfo.agentName}" (${agentInfo.agentId}) conectado desde ${agentInfo.ip}`);

  socket.emit("print_agent:registered", {
    ok: true,
    agentInfo,
    serverTime: new Date().toISOString(),
  });

  emitEvent("print_agent:status_change", getStatus());

  // Al conectarse, enviar de inmediato cualquier trabajo pendiente
  dispatchPendingJobsToSocket(socket).catch((err) => {
    console.error("[PRINT AGENT] Error despachando trabajos pendientes al nuevo agente:", err.message);
  });

  return true;
}

function unregisterAgent(socket) {
  if (connectedAgents.has(socket.id)) {
    const info = connectedAgents.get(socket.id);
    connectedAgents.delete(socket.id);
    console.log(`[PRINT AGENT] Agente "${info.agentName}" desconectado (${socket.id})`);
    emitEvent("print_agent:status_change", getStatus());
  }
}

async function getPendingJobs(limit = 50) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);

  // 1. Limpiar automáticamente trabajos pendientes obsoletos (> 10 minutos)
  try {
    await query(
      `UPDATE print_jobs
       SET status = 'failed', error_message = 'Cancelado automáticamente por antigüedad (>10m)', completed_at = NOW()
       WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
    );
  } catch (_) {}

  // 2. Obtener solo trabajos pendientes recientes
  const [rows] = await query(
    `SELECT id, printer_target, printer_ip, printer_port, job_type, account_id,
            payload_size, payload_json, status, attempts, error_message, created_at
     FROM print_jobs
     WHERE status = 'pending'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
     ORDER BY id ASC
     LIMIT ?`,
    [lim]
  );
  return rows || [];
}

async function dispatchPendingJobsToSocket(socket) {
  const pending = await getPendingJobs(20);
  if (pending.length > 0) {
    console.log(`[PRINT AGENT] Despachando ${pending.length} trabajos pendientes al agente ${socket.id}`);
    for (const job of pending) {
      let parsedPayload = null;
      try {
        parsedPayload = job.payload_json ? JSON.parse(job.payload_json) : null;
      } catch (_) {}

      socket.emit("print:new_job", {
        jobId: job.id,
        jobType: job.job_type,
        printerTarget: job.printer_target,
        printerIp: job.printer_ip,
        printerPort: job.printer_port || 9100,
        payloadData: parsedPayload,
        createdAt: job.created_at,
      });
    }
  }
}

function emitNewJob(jobData) {
  const io = getSocket();
  if (!io) return false;
  io.to("room:print-agents").emit("print:new_job", jobData);
  return true;
}

async function ackJob(jobId, status, errorMessage = null) {
  const normalizedStatus = status === "success" ? "success" : "failed";
  const err = errorMessage ? String(errorMessage).slice(0, 500) : null;

  try {
    await query(
      `UPDATE print_jobs
       SET status = ?, error_message = ?, attempts = attempts + 1, completed_at = NOW()
       WHERE id = ?`,
      [normalizedStatus, err, Number(jobId)]
    );
  } catch (dbErr) {
    console.warn(`[PRINT AGENT] No pude actualizar print_jobs para #${jobId}:`, dbErr.message);
  }

  // Si alguien estaba esperando este ACK sincrónicamente (ej. test page)
  if (pendingAckResolvers.has(Number(jobId))) {
    const resolver = pendingAckResolvers.get(Number(jobId));
    pendingAckResolvers.delete(Number(jobId));
    resolver({ ok: normalizedStatus === "success", status: normalizedStatus, error: err });
  }

  // Notificar a clientes de UI
  emitEvent("print:job_updated", {
    jobId: Number(jobId),
    status: normalizedStatus,
    errorMessage: err,
  });

  return { ok: true, jobId, status: normalizedStatus };
}

function waitForJobAck(jobId, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const id = Number(jobId);
    if (!id) {
      return resolve({ ok: true, delegatedToAgent: true });
    }

    const timer = setTimeout(() => {
      pendingAckResolvers.delete(id);
      resolve({
        ok: false,
        error: `Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s) esperando confirmación de la impresora en red local`,
        timeout: true,
      });
    }, timeoutMs);

    pendingAckResolvers.set(id, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

module.exports = {
  validateSecret,
  hasConnectedAgents,
  getConnectedAgentsList,
  getStatus,
  registerAgent,
  unregisterAgent,
  getPendingJobs,
  dispatchPendingJobsToSocket,
  emitNewJob,
  ackJob,
  waitForJobAck,
};
