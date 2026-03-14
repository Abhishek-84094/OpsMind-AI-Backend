const { Worker } = require("bullmq");
const { getRedisClient } = require("../config/redis");
const { generateEmbedding } = require("../services/embeddingService");
const Chunk = require("../models/Chunk");

let embeddingWorker = null;

const startWorker = async () => {
  try {
    const redis = getRedisClient();

    if (!redis) {
      console.log("⚠️ Redis not available, skipping worker");
      return null;
    }

    embeddingWorker = new Worker(
      "embeddingQueue",
      async (job) => {
        try {
          const { chunkId, text } = job.data;
          const embedding = await generateEmbedding(text);
          await Chunk.findByIdAndUpdate(chunkId, { embedding });
          return { success: true, chunkId };
        } catch (error) {
          throw new Error(`Embedding failed: ${error.message}`);
        }
      },
      {
        connection: redis,
        concurrency: 5,
        settings: {
          lockDuration: 30000,
          lockRenewTime: 15000,
          maxStalledCount: 2
        }
      }
    );

    embeddingWorker.on("completed", (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    embeddingWorker.on("failed", (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    embeddingWorker.on("error", (err) => {
      console.error("❌ Worker error:", err.message);
    });

    console.log("✅ Embedding worker started (concurrency: 5)");
    return embeddingWorker;
  } catch (error) {
    console.error("❌ Failed to start worker:", error.message);
    return null;
  }
};

const stopWorker = async () => {
  if (embeddingWorker) {
    await embeddingWorker.close();
    console.log("🛑 Embedding worker stopped");
  }
};

const getWorker = () => embeddingWorker;

module.exports = { startWorker, stopWorker, getWorker };
