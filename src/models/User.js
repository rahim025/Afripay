const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const { readDB, writeDB } = require("../config/db");

const SALT_ROUNDS = parseInt(process.env.PIN_SALT_ROUNDS || "10", 10);

/**
 * IMPORTANT SÉCURITÉ :
 * - On ne stocke JAMAIS le mot de passe Gmail de l'utilisateur.
 * - Le PIN AfriPay est toujours stocké sous forme de hash (bcrypt), jamais en clair.
 * - Le numéro de téléphone reste la clé du portefeuille / Mobile Money, PAS le Gmail.
 */
class User {
  static findByPhone(phone) {
    const db = readDB();
    return db.users.find((u) => u.phone === phone) || null;
  }

  static findByEmail(email) {
    const db = readDB();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  static findById(id) {
    const db = readDB();
    return db.users.find((u) => u.id === id) || null;
  }

  static async create({ firstName, lastName, phone, country, currency, email, pin }) {
    const db = readDB();

    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

    const user = {
      id: uuidv4(),
      firstName,
      lastName,
      phone,
      country,
      currency,
      email,
      pinHash,
      phoneVerified: false,
      emailVerified: false,
      emailIsRecoveryAddress: false, // devient true seulement après vérification
      mobileMoneyConnected: false,
      emailConsentGiven: true, // consentement explicite requis avant création
      emailNotificationPreferences: {
        unusualLogin: true,
        accountInfoChange: true,
        pinChange: true,
        transactionConfirmation: true,
        periodicStatement: true,
        accountRecovery: true, // non désactivable (sécurité critique)
        securityAlerts: true, // non désactivable (sécurité critique)
      },
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    writeDB(db);
    return user;
  }

  static async verifyPin(user, pin) {
    return bcrypt.compare(pin, user.pinHash);
  }

  static update(userId, updates) {
    const db = readDB();
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    writeDB(db);
    return db.users[idx];
  }

  /** Représentation "sûre" du profil, jamais de pinHash exposé */
  static toProfile(user) {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      country: user.country,
      currency: user.currency,
      mobileMoneyConnected: user.mobileMoneyConnected,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
    };
  }
}

module.exports = User;
