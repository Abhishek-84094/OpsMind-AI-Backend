const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

// Routes
router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;

// Protected test route
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});