const express = require("express");
const { register, verifyPhone, verifyEmail, login } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/verify-phone", verifyPhone);
router.post("/verify-email", verifyEmail);
router.post("/login", login);

module.exports = router;
