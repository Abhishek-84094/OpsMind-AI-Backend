const { createClient } = require("redis");

let client = null;
let isConnected = false;

const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    console.log("⚠️ Redis URL not provided — skipping Redis");
    return null;
  }

  try {
    const isSecure = process.env.REDIS_URL.startsWith('rediss://');
    
    const config = {
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: () => false // Don't retry
      }
    };

    if (isSecure) {
      config.socket.tls = true;
      config.socket.rejectUnauthorized = false;
    }

    client = createClient(config);

    client.on("error", (err) => {
      isConnected = false;
      console.error("❌ Redis Error:", err.message);
    });

    client.on("connect", () => {
      isConnected = true;
      console.log("✅ Redis Connected");
    });

    // Set timeout for connection attempt
    const connectionPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), 4000)
    );

    await Promise.race([connectionPromise, timeoutPromise]);
    return client;
  } catch (err) {
    console.warn("⚠️ Redis connection skipped:", err.message);
    client = null;
    isConnected = false;
    return null;
  }
};

const getRedisClient = () => (isConnected ? client : null);

module.exports = { connectRedis, getRedisClient };
