const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getDocuments,
  getDocumentDetails,
  deleteDocument,
  shareDocument
} = require("../controllers/documentController");

router.get("/", protect, getDocuments);
router.get("/:documentId", protect, getDocumentDetails);
router.delete("/:documentId", protect, authorize(null, "canDeleteDocuments"), deleteDocument);
router.post("/:documentId/share", protect, shareDocument);

module.exports = router;
