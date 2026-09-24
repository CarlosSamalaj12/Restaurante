// src/common/db.js
// Conexión y utilidades transaccionales para MariaDB / MySQL

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "restaurant_pos",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Ejecuta una consulta SQL en el pool o en una conexión transaccional existente.
 */
function query(sql, params = [], conn = null) {
  const executor = conn || pool;
  return executor.query(sql, params);
}

/**
 * Ejecuta un bloque de operaciones dentro de una transacción atómica (START TRANSACTION, COMMIT, ROLLBACK).
 * @param {Function} callback - Función que recibe la conexión transaccional 'conn'
 */
async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Ejecuta SQL ignorando errores de duplicación de columnas/índices (útil para migraciones idempotentes).
 */
async function safeExec(sql, params = [], conn = null) {
  try {
    await query(sql, params, conn);
  } catch (e) {
    const msg = String(e.message || "");
    if (
      msg.includes("Duplicate column name") ||
      msg.includes("Duplicate key name") ||
      msg.includes("already exists")
    ) {
      return;
    }
    throw e;
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  safeExec,
};
