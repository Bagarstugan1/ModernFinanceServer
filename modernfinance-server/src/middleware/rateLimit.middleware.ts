import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config/app.config';
import { logger } from '../utils/logger';

export const createRateLimiter = (options?: Partial<Options>) => {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: config.rateLimit.message,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    
    handler: (req: Request, res: Response) => {
      logger.warn({
        message: 'Rate limit exceeded',
        ip: req.ip,
        path: req.path,
        userAgent: req.get('user-agent'),
      });
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: config.rateLimit.message,
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
    
    ...options,
  });
};

// Create specific rate limiters for different endpoints
export const strictRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests for this resource, please try again later.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});