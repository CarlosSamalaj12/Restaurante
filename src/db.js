// src/db.js
// Re-exporta el pool y helpers desde src/common/db.js para compatibilidad retroactiva

const commonDb = require("./common/db");

module.exports = {
  pool: commonDb.pool,
  query: commonDb.query,
  withTransaction: commonDb.withTransaction,
  safeExec: commonDb.safeExec,
};
