const genAI = require("../config/gemini");
const { Readable } = require("stream");
const logger = require("../utils/logger");

const generateAnswer = async (prompt) => {
  try {
    logger.info("Initializing Gemini model...");
    
    // Try different models
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
    
    for (const modelName of models) {
      try {
        logger.info(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        logger.info(`✓ Answer generated with ${modelName}`);
        return text;
      } catch (err) {
        logger.warn(`${modelName} failed: ${err.message.split('\n')[0]}`);
        continue;
      }
    }
    
    // If all models fail, use fallback
    throw new Error("All models failed, using fallback");
    
  } catch (error) {
    logger.error("Gemini Error - Using Fallback:", error.message);
    
    // Fallback: Extract answer from context
    try {
      const contextMatch = prompt.match(/Context:\n([\s\S]*?)\n\nQuestion:/);
      const questionMatch = prompt.match(/Question: (.*?)\n\nAnswer:/);
      
      if (contextMatch && questionMatch) {
        const context = contextMatch[1];
        const question = questionMatch[1];
        
        // Extract keywords
        const keywords = question
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 3);
        
        // Split into sentences
        const sentences = context
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        // Find relevant sentences
        const relevantSentences = sentences.filter(sentence => {
          const sentenceLower = sentence.toLowerCase();
          return keywords.some(keyword => sentenceLower.includes(keyword));
        });
        
        if (relevantSentences.length > 0) {
          const answer = relevantSentences.slice(0, 3).join(". ") + ".";
          logger.info("✓ Fallback answer generated from context");
          return answer;
        }
        
        // If no keyword match, return first few sentences
        const answer = sentences.slice(0, 3).join(". ") + ".";
        logger.info("✓ Fallback answer generated (first sentences)");
        return answer;
      }
      
      return "Based on the available documents, I found relevant information. Please try rephrasing your question for a more specific answer.";
      
    } catch (fallbackErr) {
      logger.error("Fallback error:", fallbackErr.message);
      throw error;
    }
  }
};

const generateAnswerStream = async (prompt, isStream = false) => {
  try {
    logger.info("Initializing Gemini model for streaming...");
    
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
    
    for (const modelName of models) {
      try {
        logger.info(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        if (!isStream) {
          return await generateAnswer(prompt);
        }

        logger.info("Starting stream generation...");
        const result = await model.generateContentStream(prompt);
        const readable = new Readable();

        (async () => {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              readable.push(text);
            }
            readable.push(null);
            logger.info("✓ Stream completed");
          } catch (error) {
            logger.error("Stream error:", error.message);
            readable.destroy(error);
          }
        })();

        return readable;
      } catch (err) {
        logger.warn(`${modelName} failed: ${err.message.split('\n')[0]}`);
        continue;
      }
    }
    
    throw new Error("All models failed, using fallback");
    
  } catch (error) {
    logger.error("Gemini Stream Error - Using Fallback:", error.message);
    
    // Return fallback stream
    const readable = new Readable();
    (async () => {
      try {
        const answer = await generateAnswer(prompt);
        readable.push(answer);
        readable.push(null);
      } catch (err) {
        readable.destroy(err);
      }
    })();
    return readable;
  }
};

module.exports = { generateAnswer, generateAnswerStream };
