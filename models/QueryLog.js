const mongoose = require("mongoose");

const queryLogSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    index: true
  },
  answer: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true
  },
  sources: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      index: true
    }
  ],
  similarityScores: [Number],
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  responseTime: Number,
  status: {
    type: String,
    enum: ["success", "partial", "failed"],
    default: "success"
  }
}, { timestamps: true });

// Index for faster queries
queryLogSchema.index({ createdAt: -1 });
queryLogSchema.index({ userId: 1, createdAt: -1 });
queryLogSchema.index({ confidence: -1 });

module.exports = mongoose.model("QueryLog", queryLogSchema);
