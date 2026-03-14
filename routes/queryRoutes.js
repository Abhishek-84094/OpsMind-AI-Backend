const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { askQuestion, askQuestionStream } = require("../controllers/queryController");

router.post("/ask", protect, authorize(null, "canQuery"), askQuestion);
router.post("/ask-stream", protect, authorize(null, "canQuery"), askQuestionStream);

module.exports = router;