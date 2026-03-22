const { Redis } = require('@upstash/redis');

// Initialize Upstash Redis Client
let redisClient = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('[Redis] Initialized Upstash Redis client');
  } else {
    console.warn('[Redis] Upstash Redis credentials missing. Cache layer disabled.');
  }
} catch (err) {
  // If Redis fails -> log error and continue with DB
  console.error('[Redis] Failed to initialize Redis client:', err.message);
}

module.exports = redisClient;
