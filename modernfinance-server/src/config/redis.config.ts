import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

export const cacheTTL = {
  default: 3600, // 1 hour
  short: 300, // 5 minutes
  long: 86400, // 24 hours
};

export const cachePrefix = 'modernfinance:';

// Parse Redis URL if provided by Railway
// Use REDIS_URL as primary (Railway's standard variable)
const redisUrl = process.env['REDIS_URL'];
let redisOptions: Partial<RedisOptions> = {};

// Debug logging for Redis configuration
if (process.env['NODE_ENV'] === 'production') {
  console.log('Redis URL found:', redisUrl ? 'Yes' : 'No');
  if (redisUrl) {
    const url = new URL(redisUrl);
    console.log('Redis URL scheme:', url.protocol);
    console.log('Using Redis host:', url.hostname);
    console.log('TLS enabled:', redisUrl.includes('proxy.rlwy.net') || redisUrl.startsWith('rediss://'));
  }
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
  connectTimeout: 30000, // Increase timeout for Railway
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // Don't connect immediately
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
};

// Add TLS configuration for Railway's public Redis proxy
// Railway's public URL often requires TLS
if (process.env['REDIS_TLS'] === 'true' || redisUrl?.includes('proxy.rlwy.net')) {
  redisConfig.tls = {
    rejectUnauthorized: false,
  };
}

// Create Redis client instance
// Use the URL directly if available for better Railway compatibility
export const redis = redisUrl 
  ? new Redis(redisUrl, {
      family: 0, // IPv4+IPv6 support
      tls: redisUrl.includes('proxy.rlwy.net') || redisUrl.startsWith('rediss://') 
        ? { rejectUnauthorized: false } 
        : undefined,
      connectTimeout: 30000,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      enableOfflineQueue: false,
    })
  : new Redis(redisConfig);

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

redis.on('connect', () => {
  logger.info('Redis connected successfully!');
});

redis.on('ready', () => {
  logger.info('Redis is ready to accept commands');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});