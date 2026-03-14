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
    // Debug: Check Environment Variables
    console.log("🔐 GROQ KEY:", process.env.GROQ_API_KEY ? "SET" : "NOT SET");
    console.log("📦 MONGO URI:", process.env.MONGO_URI ? "SET" : "NOT SET");
    console.log("📡 REDIS URL:", process.env.REDIS_URL ? "SET" : "NOT SET");

    // Check if Groq API key is set
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }

    // 1️⃣ Connect MongoDB
    await connectDB();
    console.log("✅ MongoDB Connected");

    // 2️⃣ Connect Redis (Optional)
    try {
      await connectRedis();
      console.log("✅ Redis Connected");
    } catch (err) {
      console.warn("⚠️ Redis not available — skipping cache");
    }

    // 3️⃣ Initialize Queue (Optional)
    try {
      await initializeQueue();
      console.log("✅ Queue Initialized");
    } catch (err) {
      console.warn("⚠️ Queue initialization failed:", err.message);
    }

    // 4️⃣ Start Worker (Optional)
    try {
      await startWorker();
      console.log("✅ Worker Started");
    } catch (err) {
      console.warn("⚠️ Worker startup failed:", err.message);
    }

    // 5️⃣ Start Express Server
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
};

// Graceful Shutdown
const shutdown = async () => {
  console.log("🛑 Shutting down gracefully...");
  try {
    await stopWorker();
  } catch (err) {
    console.warn("⚠️ Worker shutdown error:", err.message);
  }

  if (server) {
    server.close(() => {
      console.log("🚫 Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start Application
startServer();