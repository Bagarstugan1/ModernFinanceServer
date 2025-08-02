import { Request, Response, NextFunction } from 'express';
import { marketService } from '../services/market.service';
import { cacheService } from '../services/cache.service';

export class MarketController {
  async getFundamentals(req: Request, res: Response, next: NextFunction) {
    try {
      const { symbol } = req.params;
      
      if (!symbol || !symbol.match(/^[A-Z]{1,5}$/)) {
        return res.status(400).json({ 
          error: { message: 'Invalid symbol format' }
        });
      }

      // Check cache first
      const cacheKey = cacheService.generateKey('fundamentals', symbol);
      const cached = await cacheService.get<Record<string, number>>(cacheKey);
      
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Fetch from market data service
      const fundamentals = await marketService.getFundamentals(symbol);
      
      // Cache for 15 minutes
      await cacheService.set(cacheKey, fundamentals, { ttl: 900 });

      res.setHeader('X-Cache', 'MISS');
      res.json(fundamentals);
    } catch (error) {
      next(error);
    }
  }

  async getSentiment(req: Request, res: Response, next: NextFunction) {
    try {
      const { symbol } = req.params;
      
      if (!symbol || !symbol.match(/^[A-Z]{1,5}$/)) {
        return res.status(400).json({ 
          error: { message: 'Invalid symbol format' }
        });
      }

      // Check cache
      const cacheKey = cacheService.generateKey('sentiment', symbol);
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Fetch sentiment
      const sentiment = await marketService.getSentiment(symbol);
      
      // Cache for 30 minutes
      await cacheService.set(cacheKey, sentiment, { ttl: 1800 });

      res.setHeader('X-Cache', 'MISS');
      res.json(sentiment);
    } catch (error) {
      next(error);
    }
  }
}