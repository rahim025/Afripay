# AfriPay – Backend Inscription, Sécurité & Notifications

Backend Node.js/Express implémentant :

- **Inscription** : prénom, nom, téléphone, pays, devise, Gmail, création de PIN, vérification OTP du téléphone, vérification de l'adresse Gmail.
- **Sécurité** : PIN hashé (bcrypt), jamais de mot de passe Gmail stocké, email de récupération activé seulement après vérification.
- **Notifications** : in-app (`💰`, `💸`, `🔐`...) et par email (connexion inhabituelle, changement d'infos, changement de PIN, confirmation de transaction, relevé, récupération, alertes de sécurité), avec préférences utilisateur (`Profil → Paramètres → Notifications`).
- **Profil** : affichage nom, téléphone, email, pays, devise, statut Mobile Money ; modification de l'email avec nouvelle vérification obligatoire.
- Le **numéro de téléphone** reste la clé du portefeuille / Mobile Money — le Gmail ne remplace jamais cette fonction.
- Les emails **ne contiennent jamais** : PIN, mot de passe, code secret Mobile Money ou toute donnée d'authentification sensible.

## Structure

```
afripay/
├── src/
│   ├── server.js
│   ├── config/db.js          # stockage JSON de démo (à remplacer par une vraie DB en prod)
│   ├── models/User.js
│   ├── utils/{otp,email,validators}.js
│   ├── middleware/auth.js
│   ├── controllers/{authController,profileController,notificationController}.js
│   ├── routes/{authRoutes,profileRoutes,notificationRoutes}.js
│   └── services/notificationService.js
├── package.json
└── .env.example
```

## Installation

```bash
npm install
cp .env.example .env   # puis remplir les vraies valeurs (SMTP, JWT_SECRET, etc.)
npm run dev
```

## Endpoints principaux

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription initiale |
| POST | `/api/auth/verify-phone` | Vérification OTP du téléphone |
| POST | `/api/auth/verify-email` | Vérification de l'adresse Gmail |
| POST | `/api/auth/login` | Connexion (téléphone + PIN) |
| GET  | `/api/profile` | Affiche le profil |
| POST | `/api/profile/email/change` | Demande de changement d'email |
| POST | `/api/profile/email/confirm` | Confirme le nouvel email |
| POST | `/api/profile/pin/change` | Change le PIN AfriPay |
| GET  | `/api/notifications/in-app` | Liste les notifications in-app |
| GET/PATCH | `/api/notifications/email-preferences` | Gère les préférences email |

## ⚠️ Important avant la production

- Remplacer le stockage JSON (`src/config/db.js`) par une vraie base de données (PostgreSQL, MongoDB...).
- Brancher un vrai fournisseur SMS pour l'envoi des OTP (Twilio, Africa's Talking, etc.).
- Configurer un vrai serveur SMTP (SendGrid, AWS SES, Mailgun...).
- Si connexion Google proposée, utiliser Google OAuth officiel (ne jamais demander le mot de passe Gmail).
- Auditer que les préférences `accountRecovery` et `securityAlerts` restent bien non désactivables côté frontend aussi.

## Pousser ce projet sur GitHub

```bash
cd afripay
git init
git add .
git commit -m "Initial commit: AfriPay backend (inscription, sécurité, notifications)"
git branch -M main
git remote add origin https://github.com/<votre-utilisateur>/afripay.git
git push -u origin main
```
