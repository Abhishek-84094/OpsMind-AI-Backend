const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getRegisteredEmails,
} = require("../controllers/authController");

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/emails", getRegisteredEmails);

module.exports = router;

// Protected test route
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});
