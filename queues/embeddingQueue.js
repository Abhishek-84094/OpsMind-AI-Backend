const { Queue } = require("bullmq");
const { getRedisClient } = require("../config/redis");

let embeddingQueue = null;

const initializeQueue = async () => {
  try {
    const redis = getRedisClient();

    if (!redis) {
      console.log("⚠️ Redis not available, skipping queue");
      return null;
    }

    embeddingQueue = new Queue("embeddingQueue", {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true
      }
    });

    console.log("✅ Embedding queue initialized");
    return embeddingQueue;
  } catch (error) {
    console.error("❌ Failed to initialize queue:", error.message);
    return null;
  }
};

const getQueue = () => embeddingQueue;

module.exports = { initializeQueue, getQueue };
