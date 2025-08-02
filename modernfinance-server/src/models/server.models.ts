// Server-specific models that match the implementation

// Match iOS AgentType exactly with raw values
export enum AgentType {
  optimist = 'Optimist Analyst',
  skeptical = 'Skeptical Analyst',
  technical = 'Technical Analyst',
  fundamental = 'Fundamental Analyst',
  risk = 'Risk Analyst',
  consensus = 'Consensus Builder',
  neutralArbitrator = 'Neutral Arbitrator'
}

export enum AgentBias {
  bullish = 'Bullish',
  bearish = 'Bearish',
  neutral = 'Neutral'
}

export interface MarketSentiment {
  analystRating: number;
  socialSentiment: number;
  newsVolume: number;
  sentimentTrend: string;
}

export interface CompetitiveAnalysis {
  marketPosition: string;
  competitiveAdvantages: string[];
  threatsFromCompetitors: string[];
  barrierToEntry: number;
  switchingCosts: number;
  networkEffects: number;
  brandStrength: number;
}

export interface AgentPerspective {
  agentType: AgentType;
  recommendation: 'Buy' | 'Hold' | 'Sell';
  targetPrice: number;
  reasoning: string;
  confidence: number;
  keyPoints: string[];
  bias: AgentBias;
}

export interface CachedAnalysisTemplate {
  symbol: string;
  fundamentals: Record<string, number>;
  marketSentiment: MarketSentiment;
  competitivePosition: CompetitiveAnalysis;
  baseAgentPerspectives: AgentPerspective[];
  cacheTimestamp: Date;
  ttl: number;
}

// Re-export from collaboration models
export { ContributionType } from './collaboration.models';