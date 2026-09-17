const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isValidGmail, isValidPhone, isValidPin } = require("../utils/validators");
const { createPhoneOtp, verifyPhoneOtp } = require("../utils/otp");
const {
  createEmailVerificationToken,
  verifyEmailToken,
  sendEmail,
  templates,
} = require("../utils/email");
const { pushInAppNotification, sendEmailNotification } = require("../services/notificationService");

const SUPPORTED_CURRENCIES = ["XOF", "XAF", "NGN", "GHS", "KES", "EUR", "USD"];

/**
 * ÉTAPE 1 : Inscription initiale.
 * Champs requis : prénom, nom, téléphone, pays, devise, gmail, pin, consentement email.
 * Ne considère PAS le compte comme actif : téléphone et email doivent être vérifiés ensuite.
 */
async function register(req, res) {
  try {
    const {
      firstName,
      lastName,
      phone,
      country,
      currency,
      email,
      pin,
      pinConfirmation,
      emailConsent, // doit être `true` : "Je comprends que mon adresse email sera utilisée..."
    } = req.body;

    if (!firstName || !lastName || !phone || !country || !currency || !email || !pin) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    if (!isValidGmail(email)) {
      return res.status(400).json({ error: "Veuillez fournir une adresse Gmail valide." });
    }

    if (!isValidPhone(phone, country)) {
      return res.status(400).json({ error: "Numéro de téléphone invalide pour ce pays." });
    }

    if (!isValidPin(pin) || pin !== pinConfirmation) {
      return res.status(400).json({ error: "Le PIN doit contenir 4 à 6 chiffres et être confirmé." });
    }

    if (!SUPPORTED_CURRENCIES.includes(String(currency).toUpperCase())) {
      return res.status(400).json({ error: "Devise non supportée." });
    }

    if (emailConsent !== true) {
      return res.status(400).json({
        error:
          "Vous devez accepter : « Je comprends que mon adresse email sera utilisée pour les notifications et la sécurité de mon compte. »",
      });
    }

    if (User.findByPhone(phone)) {
      return res.status(409).json({ error: "Ce numéro de téléphone est déjà utilisé." });
    }
    if (User.findByEmail(email)) {
      return res.status(409).json({ error: "Cette adresse email est déjà utilisée." });
    }

    const user = await User.create({
      firstName,
      lastName,
      phone,
      country,
      currency: currency.toUpperCase(),
      email,
      pin,
    });

    // Déclenche l'envoi de l'OTP par SMS (jamais par email)
    const otpCode = createPhoneOtp(phone);
    // TODO: brancher un vrai fournisseur SMS ici. Ne jamais logger le code en production.
    console.log(`[DEV ONLY] OTP pour ${phone}: ${otpCode}`);

    return res.status(201).json({
      message:
        "Compte créé. Vérifiez maintenant votre numéro de téléphone par OTP, puis votre adresse Gmail.",
      userId: user.id,
      nextStep: "verify-phone",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne lors de l'inscription." });
  }
}

/** ÉTAPE 2 : Vérification du numéro de téléphone par OTP */
async function verifyPhone(req, res) {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "Numéro et code OTP requis." });
    }

    const result = verifyPhoneOtp(phone, code);
    if (!result.valid) {
      return res.status(400).json({ error: result.reason });
    }

    const user = User.findByPhone(phone);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    User.update(user.id, { phoneVerified: true });

    // Une fois le téléphone vérifié, on lance la vérification de l'email
    const token = createEmailVerificationToken(user.email);
    const link = `https://app.afripay.example/verify-email?email=${encodeURIComponent(
      user.email
    )}&token=${token}`;

    const { subject, html } = templates.verifyEmail(user.firstName, link);
    await sendEmail({ to: user.email, subject, html });

    return res.json({
      message: "Numéro vérifié. Un email de vérification a été envoyé à votre adresse Gmail.",
      nextStep: "verify-email",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne lors de la vérification OTP." });
  }
}

/** ÉTAPE 3 : Vérification de l'adresse Gmail */
async function verifyEmail(req, res) {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ error: "Email et token requis." });
    }

    const result = verifyEmailToken(email, token);
    if (!result.valid) {
      return res.status(400).json({ error: result.reason });
    }

    const user = User.findByEmail(email);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    // L'email devient officiellement adresse de récupération SEULEMENT après vérification
    User.update(user.id, { emailVerified: true, emailIsRecoveryAddress: true });

    pushInAppNotification(user.id, {
      icon: "✅",
      message: "Votre adresse email a été vérifiée avec succès.",
    });

    return res.json({
      message: "Adresse Gmail vérifiée. Votre compte AfriPay est maintenant actif.",
      nextStep: "done",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne lors de la vérification email." });
  }
}

/** Connexion (téléphone + PIN) */
async function login(req, res) {
  try {
    const { phone, pin, deviceInfo = "Appareil inconnu", location = "Localisation inconnue" } =
      req.body;

    const user = User.findByPhone(phone);
    if (!user || !(await User.verifyPin(user, pin))) {
      return res.status(401).json({ error: "Numéro ou PIN incorrect." });
    }

    if (!user.phoneVerified) {
      return res.status(403).json({ error: "Numéro de téléphone non vérifié." });
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    pushInAppNotification(user.id, {
      icon: "🔐",
      message: "Une nouvelle connexion à votre compte a été détectée.",
    });

    await sendEmailNotification(user, "unusualLogin", {
      date: new Date().toLocaleString("fr-FR"),
      location,
      device: deviceInfo,
    });

    return res.json({ token, profile: User.toProfile(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne lors de la connexion." });
  }
}

module.exports = { register, verifyPhone, verifyEmail, login };
