require("dotenv").config();
const express = require("express");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "AfriPay API", status: "running" }));

app.get("/health", (req, res) => res.json({ status: "ok", service: "afripay-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes);

// Gestion d'erreurs générique
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur interne." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AfriPay backend démarré sur le port ${PORT}`);
});
