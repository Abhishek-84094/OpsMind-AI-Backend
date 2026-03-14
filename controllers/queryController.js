const Chunk = require("../models/Chunk");
const QueryLog = require("../models/QueryLog");
const Document = require("../models/Document");
const { generateEmbedding } = require("../services/embeddingService");
const { generateAnswerStream } = require("../services/llmService");
const { getRedisClient } = require("../config/redis");
const logger = require("../utils/logger");

const redis = getRedisClient();

// ================= KEYWORD SEARCH FUNCTION =================
function keywordSearch(question, chunks) {
  // Extract keywords from question
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2); // Only words > 2 chars

  logger.info(`Keywords: ${keywords.join(", ")}`);

  // Score each chunk
  const scored = chunks.map(chunk => {
    const chunkText = chunk.text.toLowerCase();
    let score = 0;
    let matchedKeywords = 0;

    keywords.forEach(keyword => {
      if (chunkText.includes(keyword)) {
        score += 1;
        matchedKeywords += 1;
      }
    });

    // Bonus for consecutive keywords
    const keywordPhrase = keywords.join(" ");
    if (chunkText.includes(keywordPhrase)) {
      score += 5;
    }

    return {
      ...chunk,
      score: matchedKeywords > 0 ? (score / keywords.length) : 0,
      matchedKeywords
    };
  });

  // Sort by score
  return scored.sort((a, b) => b.score - a.score);
}

// ================= ASK QUESTION =================
exports.askQuestion = async (req, res) => {
  const startTime = Date.now();

  try {
    const { question, documentIds } = req.body;
    const userId = req.user?._id;

    logger.info(`Query: "${question}"`);

    if (!question || question.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one document"
      });
    }

    // Build document filter
    let docFilter = { documentId: { $in: documentIds } };

    // Get all chunks from selected documents
    let allChunks = [];
    try {
      allChunks = await Chunk.find(docFilter)
        .select("text pageNumber documentId documentFilename")
        .lean();

      logger.info(`Found ${allChunks.length} chunks`);
    } catch (err) {
      logger.error(`Failed to fetch chunks: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to search documents"
      });
    }

    if (allChunks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected documents have no content"
      });
    }

    // Keyword search
    const scoredChunks = keywordSearch(question, allChunks);
    
    // Filter chunks with score > 0
    const relevantChunks = scoredChunks.filter(c => c.score > 0);
    
    logger.info(`Relevant chunks: ${relevantChunks.length}`);

    let topChunks = relevantChunks.slice(0, 5);

    // If no relevant chunks, use top chunks anyway
    if (topChunks.length === 0) {
      logger.warn("No relevant chunks found, using top chunks");
      topChunks = scoredChunks.slice(0, 3);
      
      if (topChunks.length === 0) {
        return res.json({
          success: true,
          question,
          answer: "I don't know based on the available documents. Please upload documents related to your question or rephrase your question.",
          sources: [],
          confidence: 0,
          responseTime: Date.now() - startTime
        });
      }
    }

    // Build context
    const context = topChunks
      .map((chunk, index) =>
        `[${index + 1}] (${chunk.documentFilename}, Page ${chunk.pageNumber}): ${chunk.text}`
      )
      .join("\n\n");

    logger.info(`Context built from ${topChunks.length} chunks`);

    const prompt = `You are a helpful assistant. Answer the question using ONLY the provided context. If you cannot find the answer in the context, say "I don't know based on the available documents."

Context:
${context}

Question: ${question}

Answer:`;

    // Generate answer
    let answer;
    try {
      logger.info("Generating answer...");
      answer = await generateAnswerStream(prompt);
      logger.info("✓ Answer generated");
    } catch (err) {
      logger.error(`LLM error: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to generate answer. Check your Gemini API key."
      });
    }

    // Calculate confidence based on matched keywords
    const avgScore = topChunks.reduce((sum, c) => sum + (c.score || 0), 0) / topChunks.length;
    const confidence = Math.min(avgScore * 100, 100);

    const response = {
      success: true,
      question,
      answer,
      sources: topChunks.map(r => ({
        documentId: r.documentId,
        documentFilename: r.documentFilename,
        pageNumber: r.pageNumber,
        similarityScore: parseFloat((r.score || 0).toFixed(3))
      })),
      confidence: parseFloat(confidence.toFixed(2)),
      responseTime: Date.now() - startTime
    };

    // Log query
    try {
      await QueryLog.create({
        question,
        answer,
        userId,
        sources: topChunks.map(r => r.documentId),
        similarityScores: topChunks.map(r => r.score || 0),
        confidence,
        responseTime: response.responseTime,
        status: "success"
      });
    } catch (err) {
      logger.warn(`Failed to log query: ${err.message}`);
    }

    logger.info(`✓ Query completed: ${confidence}% confidence`);
    res.json(response);

  } catch (error) {
    logger.error(`Query error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "An error occurred"
    });
  }
};

// ================= STREAMING RESPONSE =================
exports.askQuestionStream = async (req, res) => {
  try {
    const { question, documentIds } = req.body;
    const userId = req.user?._id;

    if (!question || question.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one document"
      });
    }

    let docFilter = { documentId: { $in: documentIds } };

    let allChunks = [];
    try {
      allChunks = await Chunk.find(docFilter)
        .select("text pageNumber documentId documentFilename")
        .lean();
    } catch (err) {
      logger.error(`Failed to fetch chunks: ${err.message}`);
      res.setHeader("Content-Type", "application/json");
      return res.status(500).json({
        success: false,
        message: "Failed to search documents"
      });
    }

    if (allChunks.length === 0) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ text: "No documents found." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    // Keyword search
    const scoredChunks = keywordSearch(question, allChunks);
    const relevantChunks = scoredChunks.filter(c => c.score > 0);
    
    let topChunks = relevantChunks.length > 0 
      ? relevantChunks.slice(0, 5)
      : scoredChunks.slice(0, 3);

    if (!topChunks.length) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ text: "I don't know based on the available documents." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const context = topChunks
      .map((chunk, index) =>
        `[${index + 1}] (${chunk.documentFilename}, Page ${chunk.pageNumber}): ${chunk.text}`
      )
      .join("\n\n");

    const prompt = `You are a helpful assistant. Answer the question using ONLY the provided context. If you cannot find the answer, say "I don't know based on the available documents."

Context:
${context}

Question: ${question}

Answer:`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await generateAnswerStream(prompt, true);

      stream.on("data", (chunk) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      });

      stream.on("end", () => {
        const avgScore = topChunks.reduce((sum, c) => sum + (c.score || 0), 0) / topChunks.length;
        const confidence = Math.min(avgScore * 100, 100);
        
        res.write(`data: ${JSON.stringify({ 
          done: true,
          sources: topChunks.map(r => ({
            documentFilename: r.documentFilename,
            pageNumber: r.pageNumber,
            similarityScore: parseFloat((r.score || 0).toFixed(3))
          })),
          confidence: parseFloat(confidence.toFixed(2))
        })}\n\n`);
        res.end();
      });

      stream.on("error", (error) => {
        logger.error(`Stream error: ${error.message}`);
        res.write(`data: ${JSON.stringify({ error: "Failed to generate answer" })}\n\n`);
        res.end();
      });
    } catch (err) {
      logger.error(`LLM stream failed: ${err.message}`);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate answer" })}\n\n`);
      res.end();
    }

  } catch (error) {
    logger.error(`Stream error: ${error.message}`);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({
      success: false,
      message: "Streaming failed"
    });
  }
};
