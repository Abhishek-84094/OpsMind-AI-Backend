const express = require("express");
const router = express.Router();

const upload = require("../config/multer");
const { uploadDocument } = require("../controllers/uploadController");
const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// Anyone can upload
router.post(
  "/",
  protect,
  upload.single("file"),
  uploadDocument
);

module.exports = router;