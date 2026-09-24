// src/common/utils.js
// Utilidades compartidas de formateo y peticiones

function money(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function clientIp(req) {
  const raw = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
  return raw.replace("::ffff:", "");
}

function normalizePaymentMethodCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeGroupType(value, min = 0, max = 1) {
  const str = String(value || "").trim().toLowerCase();
  if (str === "single" || str === "multiple") return str;
  if (min === 1 && max === 1) return "single";
  if (max > 1) return "multiple";
  return str || (max === 1 ? "single" : "multiple");
}

module.exports = {
  money,
  nowSql,
  clientIp,
  normalizePaymentMethodCode,
  normalizeGroupType,
};
