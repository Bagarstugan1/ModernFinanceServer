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
    // Fetch real market data
    const fundamentals = await marketService.getFundamentals(symbol);
    const sentiment = await marketService.getSentiment(symbol);
    
    // Generate competitive analysis
    const competitivePosition = this.generateCompetitiveAnalysis(symbol, fundamentals);
    
    // Generate real AI agent perspectives
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
  
  async cacheTemplate(symbol: string, template: CachedAnalysisTemplate): Promise<void> {
    const ttl = 3600; // 1 hour for templates
    
    // Cache the complete template
    await cacheService.set(
      cacheService.generateKey('template', symbol),
      template,
      { ttl, tags: [`symbol:${symbol}`, 'template'] }
    );
    
    // Also cache agent perspectives separately for quick access
    if (template.baseAgentPerspectives && template.baseAgentPerspectives.length > 0) {
      await cacheService.set(
        cacheService.generateKey('perspectives', symbol),
        template.baseAgentPerspectives,
        { ttl: 1800, tags: [`symbol:${symbol}`, 'perspectives'] } // 30 min for perspectives
      );
    }
  }
  
  async cacheCompleteAnalysis(symbol: string, analysisData: any, cacheLevel: CacheLevel): Promise<void> {
    const ttl = this.getTTLForCacheLevel(cacheLevel);
    
    // Extract agent perspectives from the analysis data
    const agentPerspectives = analysisData.agentPerspectives || [];
    
    // Cache the complete analysis
    await cacheService.set(
      cacheService.generateKey('analysis', symbol, cacheLevel),
      analysisData,
      { ttl, tags: [`symbol:${symbol}`, `level:${cacheLevel}`] }
    );
    
    // Always cache agent perspectives separately
    if (agentPerspectives.length > 0) {
      await cacheService.set(
        cacheService.generateKey('perspectives', symbol),
        agentPerspectives,
        { ttl: Math.min(ttl, 1800), tags: [`symbol:${symbol}`, 'perspectives'] }
      );
    }
  }
  
  async getCachedTemplate(symbol: string): Promise<CachedAnalysisTemplate | null> {
    return await cacheService.get(
      cacheService.generateKey('template', symbol)
    );
  }
  
  async getCachedAnalysis(symbol: string): Promise<any | null> {
    // Try different cache levels
    for (const level of [CacheLevel.FULL, CacheLevel.PARTIAL, CacheLevel.BASE]) {
      const cached = await cacheService.get(
        cacheService.generateKey('analysis', symbol, level)
      );
      if (cached) return cached;
    }
    
    // Fallback to template
    return this.getCachedTemplate(symbol);
  }
  
  async getCachedAgentPerspectives(symbol: string): Promise<AgentPerspective[]> {
    // Try to get cached perspectives
    const cached = await cacheService.get<AgentPerspective[]>(
      cacheService.generateKey('perspectives', symbol)
    );
    
    if (cached) {
      return cached;
    }
    
    // Try to extract from cached template
    const template = await this.getCachedTemplate(symbol);
    if (template && template.baseAgentPerspectives) {
      return template.baseAgentPerspectives;
    }
    
    // Return empty array if nothing cached
    return [];
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
  
  // Removed unused method - extractMarketSentiment
  
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