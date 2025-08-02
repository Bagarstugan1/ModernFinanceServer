import { Request, Response } from 'express';
import { analysisService, CacheLevel } from '../services/analysis.service';
import { logger } from '../utils/logger';

export class AnalysisController {
  async getBaseTemplate(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
      }

      // Check cache first
      const cached = await analysisService.getCachedAnalysis(symbol);
      if (cached) {
        res.set('X-Cache-Hit', 'true');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.json(cached);
      }

      // Generate new template
      const template = await analysisService.generateBaseTemplate(symbol);
      
      // Cache the template
      await analysisService.cacheAnalysis(symbol, template, CacheLevel.BASE);

      res.set('X-Cache-Hit', 'false');
      res.set('Cache-Control', 'public, max-age=3600');
      res.json({
        symbol,
        cacheLevel: 1,
        timestamp: new Date().toISOString(),
        baseTemplate: template
      });
    } catch (error) {
      logger.error('Error getting base template:', error);
      res.status(500).json({ 
        error: 'Failed to generate base template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async cacheAnalysisData(req: Request, res: Response) {
    try {
      const { symbol, cacheLevel, timestamp, baseTemplate, agentPerspectives } = req.body;
      
      if (!symbol || cacheLevel === undefined) {
        return res.status(400).json({ error: 'Symbol and cacheLevel are required' });
      }

      if (cacheLevel < 0 || cacheLevel > 3) {
        return res.status(400).json({ error: 'Invalid cache level. Must be between 0 and 3' });
      }

      await analysisService.cacheAnalysis(symbol, { 
        baseTemplate, 
        agentPerspectives,
        timestamp: timestamp || new Date().toISOString(),
        cacheLevel
      }, CacheLevel.PARTIAL);
      
      res.json({ 
        success: true, 
        message: 'Analysis cached successfully',
        cacheLevel
      });
    } catch (error) {
      logger.error('Error caching analysis data:', error);
      res.status(500).json({ 
        error: 'Failed to cache analysis data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCachedAnalysis(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
      }

      const cached = await analysisService.getCachedAnalysis(symbol);
      
      if (!cached) {
        return res.status(404).json({ error: 'No cached analysis found for symbol' });
      }

      // Set appropriate cache headers based on cache level
      const maxAge = cached.cacheLevel === 3 ? 7200 : cached.cacheLevel === 2 ? 3600 : 1800;
      res.set('Cache-Control', `public, max-age=${maxAge}`);
      res.set('X-Cache-Level', cached.cacheLevel.toString());
      
      res.json(cached);
    } catch (error) {
      logger.error('Error getting cached analysis:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve cached analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const analysisController = new AnalysisController();