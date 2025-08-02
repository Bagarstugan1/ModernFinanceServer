import Vapor
import Foundation

// MARK: - Core Analysis Models (matching iOS models)

struct ComprehensiveStockAnalysis: Content {
    let id: UUID
    let symbol: String
    let companyName: String
    let currentPrice: Double
    let consensusTargetPrice: Double
    let overallRecommendation: String
    let overallRiskScore: Double
    let businessModel: String
    let competitiveAdvantages: [String]
    let keyRisks: [String]
    let growthOpportunities: [String]
    let earningsForecast: [Double]
    let valuationMetrics: [String: Double]
    let fundamentalMetrics: [String: Double]
    let agentPerspectives: [AgentPerspective]
    let swarmDCF: SwarmDCFAnalysis?
    let timestamp: Date
}

struct AgentPerspective: Content {
    let agentType: AgentType
    let recommendation: String
    let targetPrice: Double
    let reasoning: String
    let confidence: Double
    let keyPoints: [String]
    let bias: AgentBias
}

enum AgentType: String, Content {
    case optimist = "Optimist"
    case skeptical = "Skeptical"
    case technical = "Technical"
    case fundamental = "Fundamental"
    case riskAnalyst = "Risk Analyst"
    case consensus = "Consensus"
    case arbitrator = "Arbitrator"
}

enum AgentBias: String, Content {
    case bullish = "Bullish"
    case bearish = "Bearish"
    case neutral = "Neutral"
}

// MARK: - SwarmDCF Models

struct SwarmDCFAnalysis: Content {
    let intrinsicValue: Double
    let currentPrice: Double
    let upside: Double
    let assumptions: DCFAssumptions
    let segments: [BusinessSegment]
    let competitivePosition: CompetitiveAnalysis
    let businessModelRisk: RiskAnalysis
    let futureProspects: [String: GrowthOutlook]
    let adjustedDiscountRate: Double
    let terminalValueJustification: String
    let marginJustification: String
    let qualitativeRiskFactors: [String]
    let competitiveAdvantagePeriod: Int
    let businessModelStrength: Double
    let sustainableMargins: Double
    let totalAddressableMarket: Double
    let realisticMarketShare: Double
    let impliedGrowthRate: Double
    let segmentProfitability: [String: Double]
    let timestamp: Date
}

struct DCFAssumptions: Content {
    let baseRevenue: Double
    let revenueGrowthYear1: Double
    let revenueGrowthYear2: Double
    let revenueGrowthYear3: Double
    let revenueGrowthYear4: Double
    let revenueGrowthYear5: Double
    let terminalGrowthRate: Double
    let discountRate: Double
    let taxRate: Double
    let operatingMargin: Double
    let capexAsPercentOfRevenue: Double
    let workingCapitalAsPercentOfRevenue: Double
    let sharesOutstanding: Double
}

struct BusinessSegment: Content {
    let name: String
    let revenue: Double
    let growthRate: Double
    let profitMargin: Double
    let competitiveAdvantage: String
    let keyDrivers: [String]
}

struct CompetitiveAnalysis: Content {
    let marketPosition: String
    let competitiveAdvantages: [String]
    let threatsFromCompetitors: [String]
    let barrierToEntry: Double
    let switchingCosts: Double
    let networkEffects: Double
    let brandStrength: Double
}

struct RiskAnalysis: Content {
    let overallRiskScore: Double
    let operationalRisks: [String]
    let financialRisks: [String]
    let marketRisks: [String]
    let regulatoryRisks: [String]
    let technologyRisks: [String]
    let keyPersonRisks: [String]
    let riskMitigationFactors: [String]
}

struct GrowthOutlook: Content {
    let shortTerm: Double
    let mediumTerm: Double
    let longTerm: Double
    let assumptions: [String]
    let catalysts: [String]
    let headwinds: [String]
}

// MARK: - Server-Specific Models

struct CachedAnalysisTemplate: Content {
    let symbol: String
    let fundamentals: [String: Double]
    let marketSentiment: MarketSentiment
    let competitivePosition: CompetitiveAnalysis
    let baseAgentPerspectives: [AgentPerspective]
    let cacheTimestamp: Date
    let ttl: Int // Time to live in seconds
}

struct MarketSentiment: Content {
    let analystRating: Double
    let socialSentiment: Double
    let newsVolume: Int
    let sentimentTrend: String
}

struct AnalysisCacheRequest: Content {
    let symbol: String
    let analysisData: ComprehensiveStockAnalysis
    let cacheLevel: CacheLevel
}

enum CacheLevel: String, Content {
    case base // Only deterministic data
    case partial // Base + some agent perspectives
    case full // Complete analysis (not recommended)
}