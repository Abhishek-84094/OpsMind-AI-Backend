const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },

    documentFilename: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    pageNumber: {
      type: Number,
      default: 1,
    },

    embedding: {
      type: [Number],
      default: [],
    },

    embeddingCached: {
      type: Boolean,
      default: false,
    },

    confidenceScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for faster queries
chunkSchema.index({ documentId: 1, pageNumber: 1 });
chunkSchema.index({ documentFilename: 1 });

module.exports = mongoose.model("Chunk", chunkSchema);
