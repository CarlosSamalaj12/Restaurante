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

function query(sql, params = []) {
  return pool.query(sql, params);
}

module.exports = { pool, query };

