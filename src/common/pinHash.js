// src/common/pinHash.js
// Encriptación y hashing irreversible con HMAC-SHA256 y Pepper secreto para PINs de empleados

const crypto = require("crypto");

const PEPPER = process.env.AUTH_PIN_PEPPER || "samapos_restaurant_secure_pin_pepper_2026";

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
