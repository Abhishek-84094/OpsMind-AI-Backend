const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getStats,
  getDashboardOverview,
  getUserStats,
  getDocumentStats,
  getAllUsers,
  updateUserRole,
  deactivateUser,
  activateUser,
  grantDocumentAccess,
  revokeDocumentAccess,
  getSystemHealth,
  getAuditLogs
} = require("../controllers/adminController");

// Dashboard
router.get("/dashboard/overview", protect, authorize("admin"), getDashboardOverview);
router.get("/stats", protect, authorize("admin"), getStats);
router.get("/health", protect, authorize("admin"), getSystemHealth);

// User Management
router.get("/users", protect, authorize("admin"), getAllUsers);
router.get("/user/:userId", protect, authorize("admin"), getUserStats);
router.put("/user/:userId/role", protect, authorize("admin"), updateUserRole);
router.put("/user/:userId/deactivate", protect, authorize("admin"), deactivateUser);
router.put("/user/:userId/activate", protect, authorize("admin"), activateUser);

// Document Management
router.get("/document/:documentId", protect, authorize("admin"), getDocumentStats);
router.post("/access/grant", protect, authorize("admin"), grantDocumentAccess);
router.post("/access/revoke", protect, authorize("admin"), revokeDocumentAccess);

// Audit & Logs
router.get("/logs/audit", protect, authorize("admin"), getAuditLogs);

module.exports = router;
