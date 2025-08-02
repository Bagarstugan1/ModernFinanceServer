import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { redisConfig, cacheTTL } from '../config/redis.config';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

class CacheService {
  private client: Redis | null = null;
  private isConnected = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0
  };

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.client = new Redis(redisConfig);

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('Redis client connected and ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.stats.errors++;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis client connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.stats.errors++;
      // Continue without cache if Redis is not available
    }
  }

  /**
   * Generate a cache key from components
   */
  public generateKey(...components: (string | number | object)[]): string {
    const keyParts = components.map(component => {
      if (typeof component === 'object') {
        // Sort object keys for consistent hashing
        const sorted = Object.keys(component).sort().reduce((obj, key) => {
          obj[key] = (component as any)[key];
          return obj;
        }, {} as any);
        return crypto.createHash('md5').update(JSON.stringify(sorted)).digest('hex');
      }
      return String(component);
    });
    
    return keyParts.join(':');
  }

  /**
   * Get value from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL and tags
   */
  public async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const ttl = options.ttl || cacheTTL.default;
      const serialized = JSON.stringify(value);

      // Set the main key-value pair
      await this.client.setex(key, ttl, serialized);

      // Handle tags for invalidation
      if (options.tags && options.tags.length > 0) {
        const pipeline = this.client.pipeline();
        
        for (const tag of options.tags) {
          const tagKey = `tag:${tag}`;
          pipeline.sadd(tagKey, key);
          pipeline.expire(tagKey, ttl);
        }
        
        await pipeline.exec();
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys at once
   */
  public async deleteMany(keys: string[]): Promise<number> {
    if (!this.isConnected || !this.client || keys.length === 0) {
      return 0;
    }

    try {
      const result = await this.client.del(...keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      logger.error('Cache deleteMany error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Invalidate all keys associated with given tags
   */
  public async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isConnected || !this.client || tags.length === 0) {
      return 0;
    }

    try {
      const allKeys = new Set<string>();
      
      // Get all keys for each tag
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.client.smembers(tagKey);
        keys.forEach(key => allKeys.add(key));
      }

      // Delete all found keys
      if (allKeys.size > 0) {
        const keysArray = Array.from(allKeys);
        const deleted = await this.deleteMany(keysArray);
        
        // Clean up tag sets
        const tagKeys = tags.map(tag => `tag:${tag}`);
        await this.client.del(...tagKeys);
        
        return deleted;
      }

      return 0;
    } catch (error) {
      logger.error('Cache invalidateByTags error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  public async ttl(key: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Cache ttl error for key ${key}:`, error);
      this.stats.errors++;
      return -1;
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  public async flush(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushdb();
      logger.warn('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0
    };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  /**
   * Check if cache service is available
   */
  public isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Helper method to get or set cache
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new value
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export cache utilities
export { cacheTTL, cachePrefix } from '../config/redis.config';

// Export types
export type { CacheOptions, CacheStats };