const { readDB, writeDB } = require("../config/db");

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || "6", 10);
const OTP_EXPIRATION_MINUTES = parseInt(process.env.OTP_EXPIRATION_MINUTES || "5", 10);

function generateOtpCode() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/**
 * Crée un OTP pour un numéro de téléphone et le "envoie" (via un provider SMS).
 * NB: le code n'est jamais envoyé par email - uniquement par SMS.
 */
function createPhoneOtp(phone) {
  const db = readDB();
  const code = generateOtpCode();
  const expiresAt = Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000;

  // On invalide les anciens OTP non utilisés pour ce numéro
  db.otps = db.otps.filter((o) => o.phone !== phone);
  db.otps.push({ phone, code, expiresAt, used: false });
  writeDB(db);

  return code; // en prod: ne jamais retourner le code, seulement déclencher l'envoi SMS
}

function verifyPhoneOtp(phone, code) {
  const db = readDB();
  const entry = db.otps.find((o) => o.phone === phone && !o.used);

  if (!entry) return { valid: false, reason: "OTP introuvable, redemandez un code." };
  if (Date.now() > entry.expiresAt) return { valid: false, reason: "OTP expiré." };
  if (entry.code !== code) return { valid: false, reason: "Code OTP incorrect." };

  entry.used = true;
  writeDB(db);
  return { valid: true };
}

module.exports = { createPhoneOtp, verifyPhoneOtp };
