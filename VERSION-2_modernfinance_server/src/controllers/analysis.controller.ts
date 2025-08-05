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
      const cached = await analysisService.getCachedTemplate(symbol);
      if (cached) {
        res.set('X-Cache-Hit', 'true');
        res.set('Cache-Control', 'public, max-age=3600');
        return res.json(cached);
      }

      // Generate new template with real data and AI perspectives
      const template = await analysisService.generateBaseTemplate(symbol);
      
      // Cache the complete template including agent perspectives
      await analysisService.cacheTemplate(symbol, template);

      res.set('X-Cache-Hit', 'false');
      res.set('Cache-Control', 'public, max-age=3600');
      res.json(template);
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
      const { symbol, analysisData, cacheLevel } = req.body;
      
      if (!symbol || !analysisData) {
        return res.status(400).json({ error: 'Symbol and analysisData are required' });
      }

      // Determine cache level from request or data
      const level = cacheLevel || (analysisData.cacheLevel === 'full' ? CacheLevel.FULL :
                                   analysisData.cacheLevel === 'partial' ? CacheLevel.PARTIAL :
                                   CacheLevel.BASE);

      // Cache the complete analysis data including agent perspectives
      await analysisService.cacheCompleteAnalysis(symbol, analysisData, level);
      
      res.json({ 
        success: true, 
        message: 'Analysis cached successfully',
        cacheLevel: level
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

      // Set appropriate cache headers
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('X-Cache-Hit', 'true');
      
      res.json(cached);
    } catch (error) {
      logger.error('Error getting cached analysis:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve cached analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCachedAgentPerspectives(req: Request, res: Response) {
    try {
      const { symbol } = req.params;
      
      if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
      }

      const perspectives = await analysisService.getCachedAgentPerspectives(symbol);
      
      if (!perspectives || perspectives.length === 0) {
        // Return empty array instead of 404 to match client expectations
        res.set('X-Cache-Hit', 'false');
        return res.json([]);
      }

      res.set('X-Cache-Hit', 'true');
      res.set('Cache-Control', 'public, max-age=1800');
      res.json(perspectives);
    } catch (error) {
      logger.error('Error getting cached agent perspectives:', error);
      // Return empty array on error to match client expectations
      res.json([]);
    }
  }
}

export const analysisController = new AnalysisController();