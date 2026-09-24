// src/common/middlewares.js
// Middlewares globales de Express

const crypto = require("crypto");
const { AppError } = require("./errors");

function traceMiddleware(req, res, next) {
  req.traceId = req.headers["x-trace-id"] || crypto.randomUUID();
  res.setHeader("x-trace-id", req.traceId);
  next();
}

function errorHandler(err, req, res, next) {
  const isAppError = err instanceof AppError;
  const status = Number(err.status || (isAppError ? err.status : 500)) || 500;
  const code = String(err.code || (status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST"));
  const message = String(err.message || "Error interno del servidor");
  const detail = err.detail || null;

  if (status >= 500) {
    console.error(`[ERROR ${code}]`, err);
  }

  res.status(status).json({
    ok: false,
    code,
    message,
    error: message,
    status,
    traceId: req?.traceId || null,
    detail,
  });
}

module.exports = {
  traceMiddleware,
  errorHandler,
};
