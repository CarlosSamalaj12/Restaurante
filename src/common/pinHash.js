// src/common/pinHash.js
// Encriptación y hashing irreversible con HMAC-SHA256 y Pepper secreto para PINs de empleados

const crypto = require("crypto");

const PEPPER = process.env.AUTH_PIN_PEPPER || "samapos_restaurant_secure_pin_pepper_2026";

if (!process.env.AUTH_PIN_PEPPER && process.env.NODE_ENV === "production") {
  console.warn(
    "[SECURITY WARNING] AUTH_PIN_PEPPER no está definido en el archivo .env. " +
    "Por favor configure un secreto robusto para los PINs de empleados."
  );
}

function hashPin(pin) {
  if (!pin) return null;
  const cleanPin = String(pin).trim();
  if (!cleanPin) return null;
  return crypto.createHmac("sha256", PEPPER).update(cleanPin).digest("hex");
}

function verifyPin(plainPin, hashedPin) {
  if (!plainPin || !hashedPin) return false;
  const computed = hashPin(plainPin);
  if (!computed || computed.length !== hashedPin.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedPin));
}

module.exports = { hashPin, verifyPin };
