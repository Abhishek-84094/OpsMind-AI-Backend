const Document = require("../models/Document");
const Chunk = require("../models/Chunk");
const User = require("../models/User");

// Get all documents accessible to user
exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = {};
    if (userRole !== "admin") {
      query = {
        $or: [
          { uploadedBy: userId },
          { _id: { $in: req.user.accessibleDocuments } }
        ]
      };
    }

    const documents = await Document.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch documents"
    });
  }
};

// Get document details with chunk count
exports.getDocumentDetails = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user._id;

    const document = await Document.findById(documentId).populate("uploadedBy", "name email");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check access
    if (
      document.uploadedBy._id.toString() !== userId.toString() &&
      !req.user.accessibleDocuments.includes(documentId) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const chunkCount = await Chunk.countDocuments({ documentId });

    res.json({
      success: true,
      data: {
        ...document.toObject(),
        chunkCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch document details"
    });
  }
};

// Delete document (admin or uploader only)
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user._id;

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    if (
      document.uploadedBy.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only admin or uploader can delete"
      });
    }

    // Delete chunks
    await Chunk.deleteMany({ documentId });

    // Delete document
    await Document.findByIdAndDelete(documentId);

    res.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete document"
    });
  }
};

// Share document with users
exports.shareDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userIds } = req.body;
    const userId = req.user._id;

    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    if (
      document.uploadedBy.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only admin or uploader can share"
      });
    }

    // Grant access to users
    await User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { accessibleDocuments: documentId } }
    );

    res.json({
      success: true,
      message: "Document shared successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to share document"
    });
  }
};
