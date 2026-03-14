const Chunk = require("../models/Chunk");
const QueryLog = require("../models/QueryLog");
const { generateAnswer } = require("../services/llmService");
const logger = require("../utils/logger");

// ================= KEYWORD SEARCH =================
function keywordSearch(question, chunks) {
  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);

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

    // Fetch chunks
    let allChunks = [];
    try {
      allChunks = await Chunk.find({ documentId: { $in: documentIds } })
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

    // Search for relevant chunks
    const scoredChunks = keywordSearch(question, allChunks);
    const relevantChunks = scoredChunks.filter(c => c.score > 0);
    
    logger.info(`Relevant chunks: ${relevantChunks.length}`);

    if (relevantChunks.length === 0) {
      return res.json({
        success: true,
        question,
        answer: "I don't know. This information is not available in the indexed documents.",
        sources: [],
        responseTime: Date.now() - startTime
      });
    }

    // Get top 3 chunks
    const topChunks = relevantChunks.slice(0, 3);
    
    // Build context
    const context = topChunks
      .map(chunk => `${chunk.documentFilename} (Page ${chunk.pageNumber}):\n${chunk.text}`)
      .join("\n\n---\n\n");

    logger.info(`Context built from ${topChunks.length} chunks`);

    // Create prompt
    const prompt = `You are a corporate knowledge assistant. Answer the question using ONLY the provided context.

RULES:
1. Answer ONLY from the context provided
2. Give ONE sentence answer maximum
3. Be direct and concise
4. If answer not found, say: "I don't know. This information is not available in the indexed documents."

CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;

    // Call Groq
    let answer;
    try {
      logger.info("Calling Groq API...");
      answer = await generateAnswer(prompt);
      logger.info("✓ Answer received from Groq");
      
      answer = answer.trim();
      
      // Get first sentence only
      const firstSentence = answer.split(/[.!?]/)[0];
      if (firstSentence) {
        answer = firstSentence.trim() + ".";
      }
      
    } catch (err) {
      logger.error(`Groq error: ${err.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to generate answer. Check your Groq API key."
      });
    }

    const topChunk = topChunks[0];

    const response = {
      success: true,
      question,
      answer,
      sources: [{
        documentId: topChunk.documentId,
        documentFilename: topChunk.documentFilename,
        pageNumber: topChunk.pageNumber
      }],
      responseTime: Date.now() - startTime
    };

    // Log query
    try {
      await QueryLog.create({
        question,
        answer,
        userId,
        sources: [topChunk.documentId],
        responseTime: response.responseTime,
        status: "success"
      });
    } catch (err) {
      logger.warn(`Failed to log query: ${err.message}`);
    }

    logger.info(`✓ Query completed in ${response.responseTime}ms`);
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

    // Fetch chunks
    let allChunks = [];
    try {
      allChunks = await Chunk.find({ documentId: { $in: documentIds } })
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

    // Search for relevant chunks
    const scoredChunks = keywordSearch(question, allChunks);
    const relevantChunks = scoredChunks.filter(c => c.score > 0);

    if (relevantChunks.length === 0) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ text: "I don't know. This information is not available in the indexed documents." })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    // Get top 3 chunks
    const topChunks = relevantChunks.slice(0, 3);
    
    // Build context
    const context = topChunks
      .map(chunk => `${chunk.documentFilename} (Page ${chunk.pageNumber}):\n${chunk.text}`)
      .join("\n\n---\n\n");

    // Create prompt
    const prompt = `You are a corporate knowledge assistant. Answer the question using ONLY the provided context.

RULES:
1. Answer ONLY from the context provided
2. Give ONE sentence answer maximum
3. Be direct and concise
4. If answer not found, say: "I don't know. This information is not available in the indexed documents."

CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      logger.info("Calling Groq API for streaming...");
      const answer = await generateAnswer(prompt);
      
      // Stream answer word by word
      const words = answer.split(" ");
      let index = 0;

      const streamWords = () => {
        if (index < words.length) {
          res.write(`data: ${JSON.stringify({ text: words[index] + " " })}\n\n`);
          index++;
          setTimeout(streamWords, 30);
        } else {
          const topChunk = topChunks[0];
          res.write(`data: ${JSON.stringify({ 
            done: true,
            sources: [{
              documentFilename: topChunk.documentFilename,
              pageNumber: topChunk.pageNumber
            }]
          })}\n\n`);
          res.end();
        }
      };

      streamWords();

    } catch (err) {
      logger.error(`OpenAI stream error: ${err.message}`);
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
