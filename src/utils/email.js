const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../config/db");

const EMAIL_TOKEN_EXPIRATION_MINUTES = 30;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * RÈGLE DE SÉCURITÉ ABSOLUE :
 * Cette fonction ne doit JAMAIS recevoir dans `html`/`text` :
 * - le PIN AfriPay
 * - un mot de passe
 * - un code secret Mobile Money
 * - toute information d'authentification sensible
 * Les templates ci-dessous respectent cette règle par construction.
 */
async function sendEmail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
}

function createEmailVerificationToken(email) {
  const db = readDB();
  const token = uuidv4();
  const expiresAt = Date.now() + EMAIL_TOKEN_EXPIRATION_MINUTES * 60 * 1000;

  db.emailTokens = db.emailTokens.filter((t) => t.email !== email);
  db.emailTokens.push({ email, token, expiresAt, used: false });
  writeDB(db);

  return token;
}

function verifyEmailToken(email, token) {
  const db = readDB();
  const entry = db.emailTokens.find((t) => t.email === email && !t.used);

  if (!entry) return { valid: false, reason: "Token introuvable." };
  if (Date.now() > entry.expiresAt) return { valid: false, reason: "Lien de vérification expiré." };
  if (entry.token !== token) return { valid: false, reason: "Token invalide." };

  entry.used = true;
  writeDB(db);
  return { valid: true };
}

/* ---------- Templates d'emails (jamais de données sensibles) ---------- */

const templates = {
  verifyEmail: (firstName, link) => ({
    subject: "Vérifiez votre adresse email AfriPay",
    html: `<p>Bonjour ${firstName},</p>
      <p>Merci de confirmer votre adresse email pour sécuriser votre compte AfriPay.</p>
      <p><a href="${link}">Cliquez ici pour vérifier votre email</a></p>
      <p>Ce lien expire dans ${EMAIL_TOKEN_EXPIRATION_MINUTES} minutes.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
  }),

  unusualLogin: (firstName, { date, location, device }) => ({
    subject: "🔐 Nouvelle connexion à votre compte AfriPay",
    html: `<p>Bonjour ${firstName},</p>
      <p>Une nouvelle connexion à votre compte a été détectée.</p>
      <ul>
        <li>Date : ${date}</li>
        <li>Localisation approximative : ${location}</li>
        <li>Appareil : ${device}</li>
      </ul>
      <p>Si ce n'était pas vous, sécurisez immédiatement votre compte depuis l'application.</p>`,
  }),

  accountInfoChanged: (firstName, field) => ({
    subject: "Modification de vos informations de compte AfriPay",
    html: `<p>Bonjour ${firstName},</p>
      <p>Votre "${field}" a été modifié avec succès.</p>
      <p>Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support AfriPay.</p>`,
  }),

  pinChanged: (firstName) => ({
    subject: "🔐 Votre PIN AfriPay a été modifié",
    html: `<p>Bonjour ${firstName},</p>
      <p>Votre PIN AfriPay vient d'être modifié avec succès.</p>
      <p>Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support AfriPay.</p>`,
  }),

  transactionConfirmation: (firstName, { type, amount, currency, date }) => ({
    subject: "✅ Confirmation de transaction AfriPay",
    html: `<p>Bonjour ${firstName},</p>
      <p>Votre ${type} de ${amount} ${currency} a été confirmé(e) le ${date}.</p>`,
  }),

  periodicStatement: (firstName, period, statementLink) => ({
    subject: `📄 Votre relevé AfriPay - ${period}`,
    html: `<p>Bonjour ${firstName},</p>
      <p>Votre relevé de transactions pour la période "${period}" est disponible.</p>
      <p><a href="${statementLink}">Consulter mon relevé</a></p>`,
  }),

  accountRecovery: (firstName, link) => ({
    subject: "🛟 Récupération de votre compte AfriPay",
    html: `<p>Bonjour ${firstName},</p>
      <p>Une demande de récupération de compte a été initiée.</p>
      <p><a href="${link}">Suivre la procédure de récupération</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et contactez le support.</p>`,
  }),

  securityAlert: (firstName, message) => ({
    subject: "🔐 Alerte de sécurité AfriPay",
    html: `<p>Bonjour ${firstName},</p><p>${message}</p>`,
  }),
};

module.exports = {
  sendEmail,
  createEmailVerificationToken,
  verifyEmailToken,
  templates,
};
