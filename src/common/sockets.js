// src/common/sockets.js
// Gestor centralizado de Socket.IO para eventos en tiempo real

let io = null;

function initSocket(ioInstance) {
  io = ioInstance;

  const printAgentService = require("../modules/print_agent/print_agent.service");

  io.on("connection", (socket) => {
    // Si el cliente se conecta identificándose como Print Agent en el handshake
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.["x-print-agent-secret"];

    if (token && printAgentService.validateSecret(token)) {
      printAgentService.registerAgent(socket, socket.handshake.auth || {});
    }

    // Registro explícito vía evento por si el cliente conecta primero y se registra después
    socket.on("print_agent:register", (data = {}) => {
      printAgentService.registerAgent(socket, data);
    });

    // Confirmación de ejecución de impresión desde el agente local
    socket.on("print:ack", async (data = {}) => {
      try {
        const { jobId, status, errorMessage } = data;
        if (jobId) {
          await printAgentService.ackJob(jobId, status, errorMessage);
        }
      } catch (err) {
        console.error("[SOCKET.IO] Error procesando print:ack:", err.message);
      }
    });

    // Petición manual de trabajos pendientes por si el agente reconecta
    socket.on("print_agent:get_pending", async () => {
      try {
        await printAgentService.dispatchPendingJobsToSocket(socket);
      } catch (err) {
        console.error("[SOCKET.IO] Error enviando pendientes al agente:", err.message);
      }
    });

    socket.on("disconnect", () => {
      printAgentService.unregisterAgent(socket);
    });
  });

  return io;
}

function getSocket() {
  return io;
}

/**
 * Emite un evento a todos los clientes conectados de forma segura.
 * @param {string} event - Nombre del evento (ej: 'sales:update', 'sales:payment')
 * @param {object} payload - Datos del evento
 */
function emitEvent(event, payload = {}) {
  if (io) {
    try {
      io.emit(event, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`[SOCKET.IO] Error emitiendo ${event}:`, err.message);
    }
  }
}

module.exports = {
  initSocket,
  getSocket,
  emitEvent,
};
