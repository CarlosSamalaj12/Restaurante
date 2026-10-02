// src/common/sockets.js
// Gestor centralizado de Socket.IO para eventos en tiempo real

let io = null;

function initSocket(ioInstance) {
  io = ioInstance;

  io.on("connection", (socket) => {
    // console.log(`[SOCKET.IO] Cliente conectado: ${socket.id}`);

    socket.on("disconnect", () => {
      // console.log(`[SOCKET.IO] Cliente desconectado: ${socket.id}`);
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
