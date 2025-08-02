import { cacheService } from './cache.service';
import { marketService } from './market.service';
import { agentService } from './agent.service';
import { 
  CachedAnalysisTemplate, 
  CompetitiveAnalysis, 
  AgentPerspective 
} from '../models/server.models';

export enum CacheLevel {
  BASE = 'base',
  PARTIAL = 'partial',
  FULL = 'full'
}

export class AnalysisService {
  async generateBaseTemplate(symbol: string): Promise<CachedAnalysisTemplate> {
    // Fetch fundamentals
    const fundamentals = await marketService.getFundamentals(symbol);
    const sentiment = await marketService.getSentiment(symbol);
    
    // Generate competitive analysis
    const competitivePosition = this.generateCompetitiveAnalysis(symbol, fundamentals);
    
    // Generate base agent perspectives
    const baseAgentPerspectives = await agentService.generateBasePerspectives(
      symbol, 
      fundamentals, 
      sentiment
    );
    
    const template: CachedAnalysisTemplate = {
      symbol,
      fundamentals,
      marketSentiment: sentiment,
      competitivePosition,
      baseAgentPerspectives,
      cacheTimestamp: new Date(),
      ttl: 3600 // 1 hour
    };
    
    return template;
  }
  
  async cacheAnalysis(symbol: string, analysisData: any, cacheLevel: CacheLevel): Promise<void> {
    const ttl = this.getTTLForCacheLevel(cacheLevel);
    
    switch (cacheLevel) {
      case CacheLevel.BASE:
        // Cache only deterministic data
        const baseData = {
          fundamentals: analysisData.fundamentalMetrics,
          competitivePosition: analysisData.swarmDCF?.competitivePosition,
          marketSentiment: this.extractMarketSentiment(analysisData)
        };
        await cacheService.set(
          cacheService.generateKey('template', symbol),
          baseData,
          { ttl }
        );
        break;
        
      case CacheLevel.PARTIAL:
        // Cache base + some agent perspectives
        const partialData = {
          ...analysisData,
          agentPerspectives: analysisData.agentPerspectives.filter((a: AgentPerspective) => 
            ['fundamental', 'technical', 'risk'].includes(a.agentType)
          )
        };
        await cacheService.set(
          cacheService.generateKey('partial', symbol),
          partialData,
          { ttl }
        );
        break;
        
      case CacheLevel.FULL:
        // Cache complete analysis (not recommended)
        await cacheService.set(
          cacheService.generateKey('full', symbol),
          analysisData,
          { ttl }
        );
        break;
    }
  }
  
  async getCachedAnalysis(symbol: string): Promise<any | null> {
    // Try full cache first
    const fullCache = await cacheService.get(
      cacheService.generateKey('full', symbol)
    );
    if (fullCache) return fullCache;
    
    // Try partial cache
    const partialCache = await cacheService.get(
      cacheService.generateKey('partial', symbol)
    );
    if (partialCache) return partialCache;
    
    // Try base template
    const templateCache = await cacheService.get(
      cacheService.generateKey('template', symbol)
    );
    return templateCache;
  }
  
  private generateCompetitiveAnalysis(_symbol: string, fundamentals: Record<string, number>): CompetitiveAnalysis {
    // Generate competitive analysis based on fundamentals
    const marketCap = fundamentals['Market Cap'] || 0;
    const margin = fundamentals['Operating Margin'] || 0;
    
    return {
      marketPosition: marketCap > 100_000_000_000 ? 'Market Leader' : 
                     marketCap > 10_000_000_000 ? 'Major Player' : 'Emerging Player',
      competitiveAdvantages: [
        margin > 0.25 ? 'High margins' : 'Cost efficiency',
        'Brand recognition',
        'Technology innovation'
      ],
      threatsFromCompetitors: [
        'New market entrants',
        'Technology disruption'
      ],
      barrierToEntry: marketCap > 50_000_000_000 ? 8.5 : 6.0,
      switchingCosts: 7.0,
      networkEffects: 6.5,
      brandStrength: marketCap > 100_000_000_000 ? 9.0 : 7.0
    };
  }
  
  private extractMarketSentiment(_analysisData: any) {
    return {
      analystRating: 4.0,
      socialSentiment: 0.7,
      newsVolume: 150,
      sentimentTrend: 'positive'
    };
  }
  
  private getTTLForCacheLevel(level: CacheLevel): number {
    switch (level) {
      case CacheLevel.BASE:
        return 3600; // 1 hour
      case CacheLevel.PARTIAL:
        return 1800; // 30 minutes
      case CacheLevel.FULL:
        return 900; // 15 minutes
      default:
        return 1800;
    }
  }
}

export const analysisService = new AnalysisService();