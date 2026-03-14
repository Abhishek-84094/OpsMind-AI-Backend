const Chunk = require("../models/Chunk");

class VectorSearchService {
  async search(queryVector, limit = 5, threshold = 0.75, documentIds = null) {
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: "embedding_index",
            path: "embedding",
            queryVector,
            numCandidates: 100,
            limit: limit * 2, // Get more to filter
          },
        },
      ];

      // Add document filter if provided
      if (documentIds && documentIds.length > 0) {
        pipeline.push({
          $match: { documentId: { $in: documentIds } },
        });
      }

      pipeline.push({
        $project: {
          text: 1,
          pageNumber: 1,
          documentId: 1,
          score: { $meta: "vectorSearchScore" },
        },
      });

      const results = await Chunk.aggregate(pipeline);

      // Apply threshold
      return results
        .filter((r) => r.score >= threshold)
        .slice(0, limit);
    } catch (err) {
      throw new Error(`Vector search failed: ${err.message}`);
    }
  }

  async getRelevantChunks(queryVector, documentIds = null, limit = 3) {
    return this.search(queryVector, limit, 0.75, documentIds);
  }
}

module.exports = new VectorSearchService();
