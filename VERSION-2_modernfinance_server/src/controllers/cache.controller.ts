import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';

export class CacheController {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await cacheService.getStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async clearSymbol(req: Request, res: Response, next: NextFunction) {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({ 
          error: { message: 'Symbol is required' }
        });
      }

      // Clear all cache entries for this symbol
      const patterns = [
        `mf:template:${symbol}*`,
        `mf:fundamentals:${symbol}*`,
        `mf:sentiment:${symbol}*`,
        `mf:agents:${symbol}*`,
        `mf:analysis:${symbol}*`
      ];

      let deletedCount = 0;
      for (const pattern of patterns) {
        const deleted = await cacheService.delete(pattern);
        if (typeof deleted === 'number') {
          deletedCount += deleted;
        }
      }

      res.json({ 
        message: `Cache cleared for symbol ${symbol}`,
        entriesDeleted: deletedCount
      });
    } catch (error) {
      next(error);
    }
  }
}