const { getRedisClient } = require("../config/redis");

const redis = getRedisClient();

class CacheService {
  async get(key) {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Cache get error:", err.message);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!redis) return false;
    try {
      await redis.set(key, JSON.stringify(value), { EX: ttl });
      return true;
    } catch (err) {
      console.error("Cache set error:", err.message);
      return false;
    }
  }

  async delete(key) {
    if (!redis) return false;
    try {
      await redis.del(key);
      return true;
    } catch (err) {
      console.error("Cache delete error:", err.message);
      return false;
    }
  }

  async clear() {
    if (!redis) return false;
    try {
      await redis.flushDb();
      return true;
    } catch (err) {
      console.error("Cache clear error:", err.message);
      return false;
    }
  }

  generateKey(prefix, ...args) {
    return `${prefix}:${args.join(":")}`;
  }
}

module.exports = new CacheService();
