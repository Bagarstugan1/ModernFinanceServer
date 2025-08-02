import { Request, Response, NextFunction } from 'express';
import { cacheService, cacheTTL } from '../services/cache.service';
import { logger } from '../utils/logger';

interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  tags?: string[] | ((req: Request) => string[]);
}

/**
 * Cache middleware for Express routes
 * 
 * @param prefix - Cache key prefix
 * @param options - Caching options
 * @returns Express middleware function
 */
export function cacheMiddleware(
  prefix: string,
  options: CacheMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<any> {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition if provided
    if (options.condition && !options.condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = options.keyGenerator
      ? options.keyGenerator(req)
      : cacheService.generateKey(prefix, req.path, req.query);

    try {
      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for key: ${cacheKey}`);
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch (error) {
      logger.error('Cache middleware get error:', error);
      // Continue without cache on error
    }

    // Cache miss - store original res.json
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        const ttl = options.ttl || cacheTTL.default;
        const tags = typeof options.tags === 'function' 
          ? options.tags(req) 
          : options.tags;

        cacheService.set(cacheKey, data, { ttl, ...(tags && { tags }) })
          .then(() => {
            logger.info(`Cached response for key: ${cacheKey}`);
          })
          .catch((error) => {
            logger.error('Cache middleware set error:', error);
          });
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache by pattern
 * 
 * @param pattern - Pattern to match cache keys
 * @returns Express middleware function
 */
export function invalidateCache(
  pattern: string | ((req: Request) => string)
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = typeof pattern === 'function' ? pattern(req) : pattern;
    
    try {
      await cacheService.delete(key);
      logger.info(`Invalidated cache key: ${key}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }

    next();
  };
}

/**
 * Invalidate cache by tags
 * 
 * @param tags - Tags to invalidate
 * @returns Express middleware function
 */
export function invalidateCacheByTags(
  tags: string[] | ((req: Request) => string[])
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const tagsToInvalidate = typeof tags === 'function' ? tags(req) : tags;
    
    try {
      const count = await cacheService.invalidateByTags(tagsToInvalidate);
      logger.info(`Invalidated ${count} cache entries with tags: ${tagsToInvalidate.join(', ')}`);
    } catch (error) {
      logger.error('Cache tag invalidation error:', error);
    }

    next();
  };
}