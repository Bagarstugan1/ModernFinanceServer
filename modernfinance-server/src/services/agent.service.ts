import { 
  AgentPerspective, 
  AgentType, 
  AgentBias, 
  MarketSentiment 
} from '../models/server.models';

class AgentService {
  async generateBasePerspectives(
    _symbol: string, 
    fundamentals: Record<string, number>,
    sentiment: MarketSentiment
  ): Promise<AgentPerspective[]> {
    const perspectives: AgentPerspective[] = [];
    
    // Generate perspectives for each agent type
    perspectives.push(this.generateFundamentalPerspective(fundamentals));
    perspectives.push(this.generateTechnicalPerspective(fundamentals));
    perspectives.push(this.generateRiskPerspective(fundamentals, sentiment));
    perspectives.push(this.generateOptimistPerspective(fundamentals, sentiment));
    perspectives.push(this.generateSkepticalPerspective(fundamentals, sentiment));
    
    return perspectives;
  }
  
  private generateFundamentalPerspective(fundamentals: Record<string, number>): AgentPerspective {
    const peRatio = fundamentals['P/E Ratio'] || 20.0;
    const revenueGrowth = fundamentals['Revenue Growth'] || 0.0;
    const roe = fundamentals['ROE'] || 0.15;
    const margin = fundamentals['Operating Margin'] || 0.15;
    
    const isUndervalued = peRatio < 20;
    const hasGrowth = revenueGrowth > 0.10;
    const isEfficient = roe > 0.20;
    const hasStrongMargins = margin > 0.20;
    
    const score = [isUndervalued, hasGrowth, isEfficient, hasStrongMargins].filter(Boolean).length;
    
    const recommendation = score >= 3 ? 'Buy' : score >= 2 ? 'Hold' : 'Sell';
    const bias: AgentBias = score >= 3 ? AgentBias.bullish : score <= 1 ? AgentBias.bearish : AgentBias.neutral;
    
    return {
      agentType: AgentType.fundamental,
      recommendation,
      targetPrice: 0.0, // Will be calculated on device
      reasoning: 'Based on comprehensive fundamental analysis of financial metrics',
      confidence: 0.75 + (score * 0.05),
      keyPoints: [
        `P/E ratio of ${peRatio.toFixed(1)} ${isUndervalued ? 'suggests undervaluation' : 'indicates fair/overvaluation'}`,
        `Revenue growth of ${(revenueGrowth * 100).toFixed(1)}%`,
        `ROE of ${(roe * 100).toFixed(1)}% ${isEfficient ? 'shows strong efficiency' : 'needs improvement'}`,
        `Operating margin of ${(margin * 100).toFixed(1)}%`
      ],
      bias
    };
  }
  
  private generateTechnicalPerspective(fundamentals: Record<string, number>): AgentPerspective {
    const currentPrice = fundamentals['Price'] || 100.0;
    const high52Week = fundamentals['52 Week High'] || 120.0;
    const low52Week = fundamentals['52 Week Low'] || 80.0;
    const beta = fundamentals['Beta'] || 1.0;
    
    const pricePosition = (currentPrice - low52Week) / (high52Week - low52Week);
    const nearHigh = pricePosition > 0.8;
    const nearLow = pricePosition < 0.2;
    const midRange = !nearHigh && !nearLow;
    
    const recommendation = nearLow ? 'Buy' : nearHigh ? 'Sell' : 'Hold';
    const bias: AgentBias = nearLow ? AgentBias.bullish : nearHigh ? AgentBias.bearish : AgentBias.neutral;
    
    return {
      agentType: AgentType.technical,
      recommendation,
      targetPrice: 0.0,
      reasoning: 'Technical analysis based on price patterns and market indicators',
      confidence: 0.70,
      keyPoints: [
        `Trading at ${(pricePosition * 100).toFixed(0)}% of 52-week range`,
        nearHigh ? 'Near resistance levels' : nearLow ? 'Near support levels' : 'In consolidation phase',
        `Beta of ${beta.toFixed(2)} ${beta > 1.5 ? 'indicates high volatility' : 'suggests stable movement'}`,
        midRange ? 'Awaiting breakout direction' : 'Clear trend identified'
      ],
      bias
    };
  }
  
  private generateRiskPerspective(
    fundamentals: Record<string, number>, 
    sentiment: MarketSentiment
  ): AgentPerspective {
    const debtToEquity = fundamentals['Debt to Equity'] || 0.5;
    const currentRatio = fundamentals['Current Ratio'] || 1.5;
    const beta = fundamentals['Beta'] || 1.0;
    
    let riskScore = 0.0;
    const riskFactors: string[] = [];
    
    // Debt risk
    if (debtToEquity > 2.0) {
      riskScore += 2.0;
      riskFactors.push(`High debt levels (D/E: ${debtToEquity.toFixed(1)})`);
    } else if (debtToEquity > 1.0) {
      riskScore += 1.0;
      riskFactors.push('Moderate debt levels');
    }
    
    // Liquidity risk
    if (currentRatio < 1.0) {
      riskScore += 2.0;
      riskFactors.push(`Liquidity concerns (Current ratio: ${currentRatio.toFixed(1)})`);
    } else if (currentRatio < 1.5) {
      riskScore += 1.0;
      riskFactors.push('Adequate liquidity');
    }
    
    // Volatility risk
    if (beta > 1.5) {
      riskScore += 1.5;
      riskFactors.push(`High volatility (Beta: ${beta.toFixed(2)})`);
    }
    
    // Sentiment risk
    if (sentiment.sentimentTrend === 'volatile' || sentiment.sentimentTrend === 'negative') {
      riskScore += 1.0;
      riskFactors.push('Negative market sentiment');
    }
    
    const recommendation = riskScore > 4 ? 'Sell' : riskScore > 2 ? 'Hold' : 'Buy';
    
    return {
      agentType: AgentType.risk,
      recommendation,
      targetPrice: 0.0,
      reasoning: 'Risk assessment based on financial stability and market conditions',
      confidence: 0.80,
      keyPoints: riskFactors.length > 0 ? riskFactors : ['Low risk profile', 'Strong financial position'],
      bias: riskScore > 3 ? AgentBias.bearish : AgentBias.neutral
    };
  }
  
  private generateOptimistPerspective(
    fundamentals: Record<string, number>,
    sentiment: MarketSentiment
  ): AgentPerspective {
    const revenueGrowth = fundamentals['Revenue Growth'] || 0.0;
    const margin = fundamentals['Gross Margin'] || 0.30;
    const fcf = fundamentals['Free Cash Flow'] || 1_000_000_000;
    
    return {
      agentType: AgentType.optimist,
      recommendation: 'Buy',
      targetPrice: 0.0,
      reasoning: 'Focusing on growth potential and positive catalysts',
      confidence: 0.85,
      keyPoints: [
        `Revenue growing at ${(revenueGrowth * 100).toFixed(1)}% annually`,
        `Strong gross margins of ${(margin * 100).toFixed(1)}%`,
        `Generating ${this.formatLargeCurrency(fcf)} in free cash flow`,
        `Positive analyst sentiment (${sentiment.analystRating.toFixed(1)}/5.0)`,
        'Market expansion opportunities ahead'
      ],
      bias: AgentBias.bullish
    };
  }
  
  private generateSkepticalPerspective(
    fundamentals: Record<string, number>,
    sentiment: MarketSentiment
  ): AgentPerspective {
    const peRatio = fundamentals['P/E Ratio'] || 20.0;
    const debtToEquity = fundamentals['Debt to Equity'] || 0.5;
    const competitionRisk = sentiment.newsVolume > 200 ? 'High competitive pressure' : 'Moderate competition';
    
    return {
      agentType: AgentType.skeptical,
      recommendation: peRatio > 30 ? 'Sell' : 'Hold',
      targetPrice: 0.0,
      reasoning: 'Identifying potential risks and overvaluation concerns',
      confidence: 0.75,
      keyPoints: [
        `P/E ratio of ${peRatio.toFixed(1)} suggests ${peRatio > 30 ? 'overvaluation' : 'full valuation'}`,
        `Debt/Equity ratio of ${debtToEquity.toFixed(1)}`,
        competitionRisk,
        'Market saturation risks',
        'Execution challenges ahead'
      ],
      bias: AgentBias.bearish
    };
  }
  
  private formatLargeCurrency(value: number): string {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
  }
}

export const agentService = new AgentService();