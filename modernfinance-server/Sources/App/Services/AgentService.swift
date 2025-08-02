import Vapor
import Foundation

final class AgentService {
    let app: Application
    
    init(_ app: Application) {
        self.app = app
    }
    
    // Generate base agent perspectives based on fundamentals
    func generateBasePerspectives(symbol: String, on req: Request) async throws -> [AgentPerspective] {
        let marketDataService = req.application.make(MarketDataService.self)
        let fundamentals = try await marketDataService.getFundamentals(symbol: symbol, on: req)
        let sentiment = try await marketDataService.getSentiment(symbol: symbol, on: req)
        
        var perspectives: [AgentPerspective] = []
        
        // Fundamental Agent
        perspectives.append(generateFundamentalPerspective(fundamentals: fundamentals))
        
        // Technical Agent
        perspectives.append(generateTechnicalPerspective(fundamentals: fundamentals))
        
        // Risk Analyst
        perspectives.append(generateRiskPerspective(fundamentals: fundamentals, sentiment: sentiment))
        
        // Optimist Agent
        perspectives.append(generateOptimistPerspective(fundamentals: fundamentals, sentiment: sentiment))
        
        // Skeptical Agent
        perspectives.append(generateSkepticalPerspective(fundamentals: fundamentals, sentiment: sentiment))
        
        return perspectives
    }
    
    // MARK: - Agent Perspective Generators
    
    private func generateFundamentalPerspective(fundamentals: [String: Double]) -> AgentPerspective {
        let peRatio = fundamentals["P/E Ratio"] ?? 20.0
        let revenueGrowth = fundamentals["Revenue Growth"] ?? 0.0
        let roe = fundamentals["ROE"] ?? 0.15
        let margin = fundamentals["Operating Margin"] ?? 0.15
        
        let isUndervalued = peRatio < 20
        let hasGrowth = revenueGrowth > 0.10
        let isEfficient = roe > 0.20
        let hasStrongMargins = margin > 0.20
        
        let score = [isUndervalued, hasGrowth, isEfficient, hasStrongMargins].filter { $0 }.count
        
        let recommendation = score >= 3 ? "Buy" : score >= 2 ? "Hold" : "Sell"
        let bias: AgentBias = score >= 3 ? .bullish : score <= 1 ? .bearish : .neutral
        
        return AgentPerspective(
            agentType: .fundamental,
            recommendation: recommendation,
            targetPrice: 0.0, // Will be calculated on device
            reasoning: "Based on comprehensive fundamental analysis of financial metrics",
            confidence: 0.75 + (Double(score) * 0.05),
            keyPoints: [
                "P/E ratio of \(String(format: "%.1f", peRatio)) \(isUndervalued ? "suggests undervaluation" : "indicates fair/overvaluation")",
                "Revenue growth of \(String(format: "%.1f%%", revenueGrowth * 100))",
                "ROE of \(String(format: "%.1f%%", roe * 100)) \(isEfficient ? "shows strong efficiency" : "needs improvement")",
                "Operating margin of \(String(format: "%.1f%%", margin * 100))"
            ],
            bias: bias
        )
    }
    
    private func generateTechnicalPerspective(fundamentals: [String: Double]) -> AgentPerspective {
        let currentPrice = fundamentals["Price"] ?? 100.0
        let high52Week = fundamentals["52 Week High"] ?? 120.0
        let low52Week = fundamentals["52 Week Low"] ?? 80.0
        let beta = fundamentals["Beta"] ?? 1.0
        
        let pricePosition = (currentPrice - low52Week) / (high52Week - low52Week)
        let nearHigh = pricePosition > 0.8
        let nearLow = pricePosition < 0.2
        let midRange = !nearHigh && !nearLow
        
        let recommendation = nearLow ? "Buy" : nearHigh ? "Sell" : "Hold"
        let bias: AgentBias = nearLow ? .bullish : nearHigh ? .bearish : .neutral
        
        return AgentPerspective(
            agentType: .technical,
            recommendation: recommendation,
            targetPrice: 0.0,
            reasoning: "Technical analysis based on price patterns and market indicators",
            confidence: 0.70,
            keyPoints: [
                "Trading at \(String(format: "%.0f%%", pricePosition * 100)) of 52-week range",
                nearHigh ? "Near resistance levels" : nearLow ? "Near support levels" : "In consolidation phase",
                "Beta of \(String(format: "%.2f", beta)) \(beta > 1.5 ? "indicates high volatility" : "suggests stable movement")",
                midRange ? "Awaiting breakout direction" : "Clear trend identified"
            ],
            bias: bias
        )
    }
    
    private func generateRiskPerspective(fundamentals: [String: Double], sentiment: MarketSentiment) -> AgentPerspective {
        let debtToEquity = fundamentals["Debt to Equity"] ?? 0.5
        let currentRatio = fundamentals["Current Ratio"] ?? 1.5
        let beta = fundamentals["Beta"] ?? 1.0
        let fcf = fundamentals["Free Cash Flow"] ?? 1_000_000_000
        
        var riskScore = 0.0
        var riskFactors: [String] = []
        
        // Debt risk
        if debtToEquity > 2.0 {
            riskScore += 2.0
            riskFactors.append("High debt levels (D/E: \(String(format: "%.1f", debtToEquity)))")
        } else if debtToEquity > 1.0 {
            riskScore += 1.0
            riskFactors.append("Moderate debt levels")
        }
        
        // Liquidity risk
        if currentRatio < 1.0 {
            riskScore += 2.0
            riskFactors.append("Liquidity concerns (Current ratio: \(String(format: "%.1f", currentRatio)))")
        } else if currentRatio < 1.5 {
            riskScore += 1.0
            riskFactors.append("Adequate liquidity")
        }
        
        // Volatility risk
        if beta > 1.5 {
            riskScore += 1.5
            riskFactors.append("High volatility (Beta: \(String(format: "%.2f", beta)))")
        }
        
        // Sentiment risk
        if sentiment.sentimentTrend == "volatile" || sentiment.sentimentTrend == "negative" {
            riskScore += 1.0
            riskFactors.append("Negative market sentiment")
        }
        
        let recommendation = riskScore > 4 ? "Sell" : riskScore > 2 ? "Hold" : "Buy"
        
        return AgentPerspective(
            agentType: .riskAnalyst,
            recommendation: recommendation,
            targetPrice: 0.0,
            reasoning: "Risk assessment based on financial stability and market conditions",
            confidence: 0.80,
            keyPoints: riskFactors.isEmpty ? ["Low risk profile", "Strong financial position"] : riskFactors,
            bias: riskScore > 3 ? .bearish : .neutral
        )
    }
    
    private func generateOptimistPerspective(fundamentals: [String: Double], sentiment: MarketSentiment) -> AgentPerspective {
        let revenueGrowth = fundamentals["Revenue Growth"] ?? 0.0
        let margin = fundamentals["Gross Margin"] ?? 0.30
        let fcf = fundamentals["Free Cash Flow"] ?? 1_000_000_000
        
        return AgentPerspective(
            agentType: .optimist,
            recommendation: "Buy",
            targetPrice: 0.0,
            reasoning: "Focusing on growth potential and positive catalysts",
            confidence: 0.85,
            keyPoints: [
                "Revenue growing at \(String(format: "%.1f%%", revenueGrowth * 100)) annually",
                "Strong gross margins of \(String(format: "%.1f%%", margin * 100))",
                "Generating \(formatLargeCurrency(fcf)) in free cash flow",
                "Positive analyst sentiment (\(String(format: "%.1f", sentiment.analystRating))/5.0)",
                "Market expansion opportunities ahead"
            ],
            bias: .bullish
        )
    }
    
    private func generateSkepticalPerspective(fundamentals: [String: Double], sentiment: MarketSentiment) -> AgentPerspective {
        let peRatio = fundamentals["P/E Ratio"] ?? 20.0
        let debtToEquity = fundamentals["Debt to Equity"] ?? 0.5
        let competitionRisk = sentiment.newsVolume > 200 ? "High competitive pressure" : "Moderate competition"
        
        return AgentPerspective(
            agentType: .skeptical,
            recommendation: peRatio > 30 ? "Sell" : "Hold",
            targetPrice: 0.0,
            reasoning: "Identifying potential risks and overvaluation concerns",
            confidence: 0.75,
            keyPoints: [
                "P/E ratio of \(String(format: "%.1f", peRatio)) suggests \(peRatio > 30 ? "overvaluation" : "full valuation")",
                "Debt/Equity ratio of \(String(format: "%.1f", debtToEquity))",
                competitionRisk,
                "Market saturation risks",
                "Execution challenges ahead"
            ],
            bias: .bearish
        )
    }
    
    // MARK: - Utility Methods
    
    private func formatLargeCurrency(_ value: Double) -> String {
        if value >= 1_000_000_000 {
            return "$\(String(format: "%.1f", value / 1_000_000_000))B"
        } else if value >= 1_000_000 {
            return "$\(String(format: "%.1f", value / 1_000_000))M"
        } else {
            return "$\(String(format: "%.0f", value / 1_000))K"
        }
    }
}

// MARK: - Application Extension

extension Application {
    func make(_ service: AgentService.Type) -> AgentService {
        return AgentService(self)
    }
}