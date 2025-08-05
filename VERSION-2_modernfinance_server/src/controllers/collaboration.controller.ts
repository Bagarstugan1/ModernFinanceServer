import { Request, Response, NextFunction } from 'express';
import { collaborationService } from '../services/collaboration.service';
import { cacheService } from '../services/cache.service';
import { ContributionClassification, ContributionType } from '../models/collaboration.models';
import { AgentType } from '../models/server.models';

export class CollaborationController {
  async classifyContribution(req: Request, res: Response, next: NextFunction) {
    try {
      const { contribution, symbol, context } = req.body;

      if (!contribution) {
        return res.status(400).json({ 
          error: { message: 'Contribution text is required' }
        });
      }

      // Check cache for similar contributions
      const cacheKey = cacheService.generateKey(
        'classification',
        Buffer.from(contribution).toString('base64').substring(0, 20)
      );
      
      const cached = await cacheService.get<ContributionClassification>(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Classify contribution
      const classification = await collaborationService.classifyContribution(
        contribution,
        symbol,
        context
      );

      // Cache for 1 hour
      await cacheService.set(cacheKey, classification, { ttl: 3600 });

      res.setHeader('X-Cache', 'MISS');
      res.json(classification);
    } catch (error) {
      next(error);
    }
  }

  async getAgentTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentType, contributionType } = req.params;

      // Validate enum values
      if (!Object.values(AgentType).includes(agentType as AgentType)) {
        return res.status(400).json({ 
          error: { message: 'Invalid agent type' }
        });
      }

      if (!Object.values(ContributionType).includes(contributionType as ContributionType)) {
        return res.status(400).json({ 
          error: { message: 'Invalid contribution type' }
        });
      }

      const templates = await collaborationService.getResponseTemplates(
        agentType as AgentType,
        contributionType as ContributionType
      );

      res.json({ templates });
    } catch (error) {
      next(error);
    }
  }

  async getRelevantAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const { contributionType, symbol, sentiment } = req.body;

      if (!contributionType) {
        return res.status(400).json({ 
          error: { message: 'Contribution type is required' }
        });
      }

      const relevance = await collaborationService.calculateAgentRelevance(
        contributionType,
        symbol,
        sentiment
      );

      res.json({ agents: relevance });
    } catch (error) {
      next(error);
    }
  }
}