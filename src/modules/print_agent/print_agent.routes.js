// src/modules/print_agent/print_agent.routes.js
// Endpoints HTTP para comunicación y fallback del Print Agent

const express = require("express");
const router = express.Router();
const printAgentService = require("./print_agent.service");

function requireAgentSecret(req, res, next) {
  const secret =
    req.headers["x-print-agent-secret"] ||
    req.query.secret ||
    req.body?.secret;

  if (!printAgentService.validateSecret(secret)) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado: x-print-agent-secret inválido o ausente",
    });
  }
  next();
}

// 1. Obtener estado general del Print Agent (Público / Diagnóstico)
router.get("/status", (_req, res) => {
  res.json({
    ok: true,
    ...printAgentService.getStatus(),
  });
});

// 2. Obtener trabajos pendientes de impresión (Requiere secret)
router.get("/pending", requireAgentSecret, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const pendingJobs = await printAgentService.getPendingJobs(limit);
    res.json({
      ok: true,
      count: pendingJobs.length,
      jobs: pendingJobs.map((j) => {
        let payload = null;
        try {
          payload = j.payload_json ? JSON.parse(j.payload_json) : null;
        } catch (_) {}
        return {
          jobId: j.id,
          jobType: j.job_type,
          printerTarget: j.printer_target,
          printerIp: j.printer_ip,
          printerPort: j.printer_port || 9100,
          payloadData: payload,
          attempts: j.attempts,
          createdAt: j.created_at,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// 3. Confirmar ejecución de un trabajo (ACK)
router.post("/ack", requireAgentSecret, async (req, res, next) => {
  try {
    const { jobId, status, errorMessage } = req.body || {};
    if (!jobId) {
      return res.status(400).json({ ok: false, error: "jobId es requerido" });
    }
    const result = await printAgentService.ackJob(jobId, status, errorMessage);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
