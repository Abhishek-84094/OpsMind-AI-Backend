const QueryLog = require("../models/QueryLog");
const Document = require("../models/Document");
const User = require("../models/User");
const Chunk = require("../models/Chunk");
const logger = require("../utils/logger");

// ================= COMPREHENSIVE ANALYTICS =================
exports.getComprehensiveAnalytics = async (filters = {}) => {
  try {
    const { startDate, endDate, userId } = filters;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const userFilter = userId ? { userId } : {};

    const [
      totalQueries,
      totalDocuments,
      totalUsers,
      totalChunks,
      topQuestions,
      avgResponseTime,
      queriesByUser,
      documentStats,
      userActivity,
      documentAccessFrequency,
      topicPopularity,
      confidenceMetrics
    ] = await Promise.all([
      QueryLog.countDocuments({ ...dateFilter, ...userFilter }),
      Document.countDocuments(),
      User.countDocuments({ isActive: true }),
      Chunk.countDocuments(),
      QueryLog.aggregate([
        { $match: { ...dateFilter, ...userFilter } },
        { $group: { _id: "$question", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      QueryLog.aggregate([
        { $match: { ...dateFilter, ...userFilter } },
        { $group: { _id: null, avgTime: { $avg: "$responseTime" } } }
      ]),
      QueryLog.aggregate([
        { $match: { ...dateFilter, ...userFilter } },
        { $group: { _id: "$userId", queryCount: { $sum: 1 }, avgTime: { $avg: "$responseTime" } } },
        { $sort: { queryCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { userName: "$user.name", queryCount: 1, avgTime: 1 } }
      ]),
      Document.aggregate([
        { $lookup: { from: "chunks", localField: "_id", foreignField: "documentId", as: "chunks" } },
        { $project: { originalName: 1, totalPages: 1, chunkCount: { $size: "$chunks" }, createdAt: 1 } },
        { $sort: { chunkCount: -1 } },
        { $limit: 10 }
      ]),
      User.aggregate([
        { $match: { isActive: true } },
        { $lookup: { from: "querylogs", localField: "_id", foreignField: "userId", as: "queries" } },
        { $project: { name: 1, email: 1, role: 1, queryCount: { $size: "$queries" } } },
        { $sort: { queryCount: -1 } },
        { $limit: 10 }
      ]),
      // Document access frequency
      QueryLog.aggregate([
        { $match: { ...dateFilter } },
        { $unwind: "$sources" },
        { $group: { _id: "$sources", accessCount: { $sum: 1 } } },
        { $sort: { accessCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: "documents", localField: "_id", foreignField: "_id", as: "document" } },
        { $unwind: "$document" },
        { $project: { documentName: "$document.originalName", accessCount: 1 } }
      ]),
      // Topic popularity (based on question keywords)
      QueryLog.aggregate([
        { $match: { ...dateFilter } },
        { $group: { _id: "$question", count: { $sum: 1 }, avgConfidence: { $avg: "$confidence" } } },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),
      // Confidence metrics
      QueryLog.aggregate([
        { $match: { ...dateFilter } },
        { $group: { 
          _id: null, 
          avgConfidence: { $avg: "$confidence" },
          maxConfidence: { $max: "$confidence" },
          minConfidence: { $min: "$confidence" },
          highConfidenceQueries: { $sum: { $cond: [{ $gte: ["$confidence", 80] }, 1, 0] } },
          mediumConfidenceQueries: { $sum: { $cond: [{ $and: [{ $gte: ["$confidence", 60] }, { $lt: ["$confidence", 80] }] }, 1, 0] } },
          lowConfidenceQueries: { $sum: { $cond: [{ $lt: ["$confidence", 60] }, 1, 0] } }
        }}
      ])
    ]);

    logger.info("Comprehensive analytics generated successfully");

    return {
      summary: {
        totalQueries,
        totalDocuments,
        totalUsers,
        totalChunks,
        avgResponseTime: avgResponseTime[0]?.avgTime || 0
      },
      topQuestions,
      queriesByUser,
      documentStats,
      userActivity,
      documentAccessFrequency,
      topicPopularity,
      confidenceMetrics: confidenceMetrics[0] || {
        avgConfidence: 0,
        maxConfidence: 0,
        minConfidence: 0,
        highConfidenceQueries: 0,
        mediumConfidenceQueries: 0,
        lowConfidenceQueries: 0
      }
    };
  } catch (error) {
    logger.error(`Analytics error: ${error.message}`);
    throw error;
  }
};

// ================= USER ANALYTICS =================
exports.getUserAnalytics = async (userId) => {
  try {
    const [queryCount, avgResponseTime, topQuestions, documentAccess, confidenceData] = await Promise.all([
      QueryLog.countDocuments({ userId }),
      QueryLog.aggregate([
        { $match: { userId } },
        { $group: { _id: null, avgTime: { $avg: "$responseTime" } } }
      ]),
      QueryLog.aggregate([
        { $match: { userId } },
        { $group: { _id: "$question", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      QueryLog.aggregate([
        { $match: { userId } },
        { $unwind: "$sources" },
        { $group: { _id: "$sources", count: { $sum: 1 } } },
        { $limit: 5 },
        { $lookup: { from: "documents", localField: "_id", foreignField: "_id", as: "document" } },
        { $unwind: "$document" },
        { $project: { documentName: "$document.originalName", count: 1 } }
      ]),
      QueryLog.aggregate([
        { $match: { userId } },
        { $group: { _id: null, avgConfidence: { $avg: "$confidence" } } }
      ])
    ]);

    logger.info(`User analytics retrieved for user: ${userId}`);

    return {
      queryCount,
      avgResponseTime: avgResponseTime[0]?.avgTime || 0,
      topQuestions,
      documentAccess,
      avgConfidence: confidenceData[0]?.avgConfidence || 0
    };
  } catch (error) {
    logger.error(`User analytics error: ${error.message}`);
    throw error;
  }
};

// ================= DOCUMENT ANALYTICS =================
exports.getDocumentAnalytics = async (documentId) => {
  try {
    const [chunkCount, queryCount, avgSimilarity, accessTrend] = await Promise.all([
      Chunk.countDocuments({ documentId }),
      QueryLog.aggregate([
        { $match: { sources: documentId } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      QueryLog.aggregate([
        { $match: { sources: documentId } },
        { $group: { _id: null, avgScore: { $avg: { $arrayElemAt: ["$similarityScores", 0] } } } }
      ]),
      QueryLog.aggregate([
        { $match: { sources: documentId } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 7 }
      ])
    ]);

    logger.info(`Document analytics retrieved for document: ${documentId}`);

    return {
      chunkCount,
      queryCount: queryCount[0]?.count || 0,
      avgSimilarity: avgSimilarity[0]?.avgScore || 0,
      accessTrend
    };
  } catch (error) {
    logger.error(`Document analytics error: ${error.message}`);
    throw error;
  }
};

// ================= KNOWLEDGE GRAPH DATA =================
exports.getKnowledgeGraphData = async (filters = {}) => {
  try {
    const { startDate, endDate } = filters;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [documentNodes, topicNodes, connectionData] = await Promise.all([
      Document.aggregate([
        { $lookup: { from: "querylogs", localField: "_id", foreignField: "sources", as: "queries" } },
        { $project: { 
          id: "$_id", 
          label: "$originalName", 
          value: { $size: "$queries" },
          type: "document"
        }},
        { $sort: { value: -1 } },
        { $limit: 20 }
      ]),
      QueryLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$question", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { 
          id: "$_id", 
          label: "$_id", 
          value: "$count",
          type: "topic"
        }}
      ]),
      QueryLog.aggregate([
        { $match: dateFilter },
        { $unwind: "$sources" },
        { $group: { _id: { question: "$question", source: "$sources" }, count: { $sum: 1 } } },
        { $limit: 30 },
        { $project: { 
          source: "$_id.question", 
          target: "$_id.source", 
          weight: "$count"
        }}
      ])
    ]);

    logger.info("Knowledge graph data generated successfully");

    return {
      nodes: [...documentNodes, ...topicNodes],
      links: connectionData
    };
  } catch (error) {
    logger.error(`Knowledge graph error: ${error.message}`);
    throw error;
  }
};
