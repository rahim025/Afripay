const { readDB, writeDB } = require("../config/db");
const { sendEmail, templates } = require("../utils/email");

/**
 * Notification in-app : stockée pour être affichée dans l'application
 * (ex: "💰 Vous avez reçu 10 000 FCFA.")
 */
function pushInAppNotification(userId, { icon = "🔔", message }) {
  const db = readDB();
  if (!db.notifications) db.notifications = [];

  db.notifications.push({
    userId,
    message: `${icon} ${message}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  writeDB(db);
}

/**
 * Envoie une notification email SEULEMENT si :
 * - l'utilisateur a vérifié son email
 * - il n'a pas désactivé ce type de notification (sauf catégories critiques non désactivables)
 * L'email envoyé ne contient jamais de PIN, mot de passe ou code secret.
 */
async function sendEmailNotification(user, category, templateArgs) {
  if (!user.emailVerified) return;

  const prefs = user.emailNotificationPreferences || {};
  if (prefs[category] === false) return; // utilisateur a désactivé cette catégorie (si désactivable)

  const templateFn = templates[category];
  if (!templateFn) throw new Error(`Template email inconnu: ${category}`);

  const { subject, html } = templateFn(user.firstName, templateArgs);
  await sendEmail({ to: user.email, subject, html });
}

module.exports = { pushInAppNotification, sendEmailNotification };
