const Groq = require("groq-sdk");
const { Readable } = require("stream");
const logger = require("../utils/logger");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const generateAnswer = async (prompt) => {
  try {
    logger.info("Calling Groq API...");
    
    const message = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a corporate knowledge assistant. Answer questions based ONLY on the provided context. Be concise and direct."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const text = message.choices[0].message.content;
    logger.info("✓ Answer generated successfully");
    return text;
    
  } catch (error) {
    logger.error(`Groq Error: ${error.message}`);
    throw error;
  }
};

const generateAnswerStream = async (prompt, isStream = false) => {
  try {
    logger.info("Initializing Groq...");
    
    if (!isStream) {
      return await generateAnswer(prompt);
    }

    logger.info("Starting stream generation...");
    
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a corporate knowledge assistant. Answer questions based ONLY on the provided context. Be concise and direct."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    const readable = new Readable();

    (async () => {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            readable.push(text);
          }
        }
        readable.push(null);
        logger.info("✓ Stream completed");
      } catch (error) {
        logger.error(`Stream error: ${error.message}`);
        readable.destroy(error);
      }
    })();

    return readable;
    
  } catch (error) {
    logger.error(`Groq Stream Error: ${error.message}`);
    throw error;
  }
};

module.exports = { generateAnswer, generateAnswerStream };
