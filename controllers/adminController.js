const QueryLog = require("../models/QueryLog");
const Document = require("../models/Document");
const User = require("../models/User");
const Chunk = require("../models/Chunk");
const { getComprehensiveAnalytics, getUserAnalytics, getDocumentAnalytics } = require("../services/adminAnalyticsService");

// ================= DASHBOARD STATS =================
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const analytics = await getComprehensiveAnalytics({ startDate, endDate, userId });
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: "Analytics failed" });
  }
};

// ================= DASHBOARD OVERVIEW ==================
exports.getDashboardOverview = async (req, res) => {
  try {
    const [totalUsers, totalDocuments, totalQueries, totalChunks, activeUsers, recentQueries] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Document.countDocuments(),
      QueryLog.countDocuments(),
      Chunk.countDocuments(),
      User.countDocuments({ isActive: true, updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      QueryLog.find().sort({ createdAt: -1 }).limit(10).populate("userId", "name email")
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalDocuments,
        totalQueries,
        totalChunks,
        activeUsers24h: activeUsers,
        recentQueries
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Dashboard overview failed" });
  }
};

// ================= USER STATS =================
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const analytics = await getUserAnalytics(userId);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: "User analytics failed" });
  }
};

// ================= DOCUMENT STATS =================
exports.getDocumentStats = async (req, res) => {
  try {
    const { documentId } = req.params;
    const analytics = await getDocumentAnalytics(documentId);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: "Document analytics failed" });
  }
};

// ================= USER MANAGEMENT =================
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };
    if (role) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];

    const [users, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, permissions } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { role, permissions },
      { new: true }
    ).select("-password");

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select("-password");

    res.json({ success: true, data: user, message: "User deactivated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to deactivate user" });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).select("-password");

    res.json({ success: true, data: user, message: "User activated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to activate user" });
  }
};

// ================= DOCUMENT ACCESS MANAGEMENT =================
exports.grantDocumentAccess = async (req, res) => {
  try {
    const { userId, documentId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { accessibleDocuments: documentId } },
      { new: true }
    ).select("-password");

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to grant access" });
  }
};

exports.revokeDocumentAccess = async (req, res) => {
  try {
    const { userId, documentId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { accessibleDocuments: documentId } },
      { new: true }
    ).select("-password");

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to revoke access" });
  }
};

// ================= SYSTEM HEALTH =================
exports.getSystemHealth = async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date(),
      services: {
        database: "connected",
        redis: "connected",
        queue: "operational"
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, message: "Health check failed" });
  }
};

// ================= AUDIT LOGS =================
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, action } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;

    const logs = await QueryLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "name email");

    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};
