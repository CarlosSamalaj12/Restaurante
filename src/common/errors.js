// src/common/errors.js
// Jerarquía de errores tipados HTTP para el sistema SamaPos

class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", detail = null) {
    super(message || "Error interno del servidor");
    this.name = this.constructor.name;
    this.status = Number(status) || 500;
    this.code = String(code || "INTERNAL_ERROR");
    this.detail = detail;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Solicitud inválida", code = "BAD_REQUEST", detail = null) {
    super(message, 400, code, detail);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "No autorizado o sesión vencida", code = "UNAUTHORIZED", detail = null) {
    super(message, 401, code, detail);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado. Permisos insuficientes", code = "FORBIDDEN", detail = null) {
    super(message, 403, code, detail);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado", code = "NOT_FOUND", detail = null) {
    super(message, 404, code, detail);
  }
}

class ConflictError extends AppError {
  constructor(message = "Conflicto en la solicitud", code = "CONFLICT", detail = null) {
    super(message, 409, code, detail);
  }
}

class InternalServerError extends AppError {
  constructor(message = "Error interno del servidor", code = "INTERNAL_ERROR", detail = null) {
    super(message, 500, code, detail);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};
