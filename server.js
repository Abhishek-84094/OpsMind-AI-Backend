require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");
const { initializeQueue } = require("./queues/embeddingQueue");
const { startWorker, stopWorker } = require("./workers/embeddingWorker");

const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    // Connect Redis
    try {
      await connectRedis();
    } catch (err) {
      console.warn("⚠️ Redis not available, continuing without cache");
    }

    // Initialize Queue
    try {
      await initializeQueue();
    } catch (err) {
      console.warn("⚠️ Queue initialization failed:", err.message);
    }

    // Start Worker
    try {
      await startWorker();
    } catch (err) {
      console.warn("⚠️ Worker startup failed:", err.message);
    }

    // Start Express server
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🚫 SIGTERM received, shutting down gracefully...");
  await stopWorker();
  server.close(() => {
    console.log("🚫 Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("🚫 SIGINT received, shutting down gracefully...");
  await stopWorker();
  server.close(() => {
    console.log("🚫 Server closed");
    process.exit(0);
  });
});

startServer();