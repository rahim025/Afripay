const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  getProfile,
  requestEmailChange,
  confirmEmailChange,
  changePin,
} = require("../controllers/profileController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getProfile);
router.post("/email/change", requestEmailChange);
router.post("/email/confirm", confirmEmailChange);
router.post("/pin/change", changePin);

module.exports = router;
