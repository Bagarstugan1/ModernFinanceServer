import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

export const cacheTTL = {
  default: 3600, // 1 hour
  short: 300, // 5 minutes
  long: 86400, // 24 hours
};

export const cachePrefix = 'modernfinance:';

// Parse Redis URL if provided by Railway
// Try multiple possible Redis URL environment variables
const redisUrl = process.env['REDIS_PUBLIC_URL'] || process.env['REDIS_URL'] || process.env['REDISURL'];
let redisOptions: Partial<RedisOptions> = {};

// Debug logging for Redis configuration
if (process.env['NODE_ENV'] === 'production') {
  console.log('Redis URL found:', redisUrl ? 'Yes' : 'No');
  console.log('Using Redis host:', redisUrl ? new URL(redisUrl).hostname : (process.env['REDIS_HOST'] || 'localhost'));
}

if (redisUrl) {
  // Railway provides Redis as a URL
  const url = new URL(redisUrl);
  redisOptions = {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
  };
} else {
  // Fallback to individual env vars
  const password = process.env['REDIS_PASSWORD'];
  redisOptions = {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    ...(password ? { password } : {}),
  };
}

export const redisConfig: RedisOptions = {
  ...redisOptions,
  db: parseInt(process.env['REDIS_DB'] || '0', 10),
  family: 0, // Enable dual-stack DNS (IPv4 + IPv6) for Railway
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

// Add TLS configuration for Railway's public Redis proxy
// Railway's public URL often requires TLS
if (process.env['REDIS_TLS'] === 'true' || redisUrl?.includes('proxy.rlwy.net')) {
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