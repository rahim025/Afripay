const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  listInAppNotifications,
  getEmailPreferences,
  updateEmailPreferences,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(authMiddleware);

router.get("/in-app", listInAppNotifications);
router.get("/email-preferences", getEmailPreferences);
router.patch("/email-preferences", updateEmailPreferences);

module.exports = router;
