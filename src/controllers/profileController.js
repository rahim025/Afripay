const User = require("../models/User");
const { isValidGmail, isValidPin } = require("../utils/validators");
const { createEmailVerificationToken, verifyEmailToken, sendEmail, templates } = require("../utils/email");
const { pushInAppNotification, sendEmailNotification } = require("../services/notificationService");

/** Affiche le profil : nom, téléphone, email, pays, devise, statut Mobile Money */
function getProfile(req, res) {
  const user = User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  return res.json(User.toProfile(user));
}

/**
 * Demande de changement d'email : n'active PAS le nouvel email immédiatement.
 * Un token de vérification est envoyé à la NOUVELLE adresse.
 */
async function requestEmailChange(req, res) {
  try {
    const { newEmail } = req.body;
    if (!isValidGmail(newEmail)) {
      return res.status(400).json({ error: "Adresse Gmail invalide." });
    }
    if (User.findByEmail(newEmail)) {
      return res.status(409).json({ error: "Cette adresse email est déjà utilisée." });
    }

    const user = User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    // On stocke l'email en attente séparément, l'ancien reste actif tant que non vérifié
    User.update(user.id, { pendingEmail: newEmail });

    const token = createEmailVerificationToken(newEmail);
    const link = `https://app.afripay.example/verify-email?email=${encodeURIComponent(
      newEmail
    )}&token=${token}`;

    const { subject, html } = templates.verifyEmail(user.firstName, link);
    await sendEmail({ to: newEmail, subject, html });

    return res.json({ message: "Email de vérification envoyé à la nouvelle adresse." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne." });
  }
}

/** Confirme le changement d'email après vérification du token envoyé à la nouvelle adresse */
async function confirmEmailChange(req, res) {
  try {
    const { token } = req.body;
    const user = User.findById(req.userId);
    if (!user || !user.pendingEmail) {
      return res.status(400).json({ error: "Aucune demande de changement d'email en cours." });
    }

    const result = verifyEmailToken(user.pendingEmail, token);
    if (!result.valid) return res.status(400).json({ error: result.reason });

    const oldEmail = user.email;
    User.update(user.id, {
      email: user.pendingEmail,
      pendingEmail: null,
      emailVerified: true,
      emailIsRecoveryAddress: true,
    });

    const updatedUser = User.findById(user.id);

    pushInAppNotification(user.id, { icon: "📧", message: "Votre adresse email a été mise à jour." });
    await sendEmailNotification(updatedUser, "accountInfoChange", { field: "adresse email" });

    // On informe aussi l'ancienne adresse par sécurité, sans détails sensibles
    await sendEmail({
      to: oldEmail,
      subject: "Changement d'adresse email sur votre compte AfriPay",
      html: `<p>Votre adresse email de compte AfriPay a été modifiée. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support.</p>`,
    });

    return res.json({ message: "Adresse email mise à jour avec succès." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne." });
  }
}

/** Changement de PIN AfriPay (jamais envoyé par email, uniquement notifié) */
async function changePin(req, res) {
  try {
    const { currentPin, newPin, newPinConfirmation } = req.body;
    const user = User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    if (!(await User.verifyPin(user, currentPin))) {
      return res.status(401).json({ error: "PIN actuel incorrect." });
    }
    if (!isValidPin(newPin) || newPin !== newPinConfirmation) {
      return res.status(400).json({ error: "Nouveau PIN invalide ou non confirmé." });
    }

    const bcrypt = require("bcryptjs");
    const pinHash = await bcrypt.hash(newPin, parseInt(process.env.PIN_SALT_ROUNDS || "10", 10));
    User.update(user.id, { pinHash });

    pushInAppNotification(user.id, { icon: "🔐", message: "Votre PIN AfriPay a été modifié." });
    await sendEmailNotification(user, "pinChange", {});

    return res.json({ message: "PIN mis à jour avec succès." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur interne." });
  }
}

module.exports = { getProfile, requestEmailChange, confirmEmailChange, changePin };
