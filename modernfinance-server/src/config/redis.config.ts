import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

export const cacheTTL = {
  default: 3600, // 1 hour
  short: 300, // 5 minutes
  long: 86400, // 24 hours
};

export const cachePrefix = 'modernfinance:';

const password = process.env['REDIS_PASSWORD'];

export const redisConfig: RedisOptions = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  ...(password ? { password } : {}),
  db: parseInt(process.env['REDIS_DB'] || '0', 10),
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
  enableOfflineQueue: true,
  lazyConnect: true,
};

// Add TLS configuration if REDIS_TLS is set
if (process.env['REDIS_TLS'] === 'true') {
  redisConfig.tls = {
    rejectUnauthorized: false,
  };
}

// Create Redis client instance
export const redis = new Redis(redisConfig);

// Connect to Redis
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection error:', error);
    throw error;
  }
}

// Handle Redis events
redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});