const User = require("../models/User");
const { readDB, writeDB } = require("../config/db");

// Catégories qui ne peuvent JAMAIS être désactivées (sécurité critique)
const NON_DISABLABLE = ["accountRecovery", "securityAlerts"];

/** Liste les notifications in-app de l'utilisateur */
function listInAppNotifications(req, res) {
  const db = readDB();
  const notifications = (db.notifications || [])
    .filter((n) => n.userId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(notifications);
}

/** Récupère les préférences email actuelles (Profil → Paramètres → Notifications) */
function getEmailPreferences(req, res) {
  const user = User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  return res.json(user.emailNotificationPreferences);
}

/** Met à jour les préférences email, en protégeant les catégories critiques */
function updateEmailPreferences(req, res) {
  const user = User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

  const updates = req.body || {};
  const current = { ...user.emailNotificationPreferences };

  for (const [key, value] of Object.entries(updates)) {
    if (NON_DISABLABLE.includes(key)) continue; // ignoré : toujours actif
    if (key in current) current[key] = Boolean(value);
  }

  User.update(user.id, { emailNotificationPreferences: current });
  return res.json({ message: "Préférences mises à jour.", preferences: current });
}

module.exports = { listInAppNotifications, getEmailPreferences, updateEmailPreferences };
