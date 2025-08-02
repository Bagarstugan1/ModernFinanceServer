import Vapor
import Redis

struct AnalysisController {
    
    // Get base analysis template for a symbol
    func getBaseTemplate(req: Request) async throws -> CachedAnalysisTemplate {
        guard let symbol = req.parameters.get("symbol") else {
            throw Abort(.badRequest, reason: "Symbol is required")
        }
        
        let cacheService = req.application.make(CacheService.self)
        
        // Check cache first
        if let cached = try await cacheService.getAnalysisTemplate(symbol: symbol, on: req) {
            req.logger.info("Cache hit for symbol: \(symbol)")
            return cached
        }
        
        req.logger.info("Cache miss for symbol: \(symbol), generating template")
        
        // Generate base template
        let template = try await generateBaseTemplate(symbol: symbol, on: req)
        
        // Cache for 1 hour
        try await cacheService.setAnalysisTemplate(template, ttl: 3600, on: req)
        
        return template
    }
    
    // Cache analysis data
    func cacheAnalysisData(req: Request) async throws -> HTTPStatus {
        let cacheRequest = try req.content.decode(AnalysisCacheRequest.self)
        
        let cacheService = req.application.make(CacheService.self)
        
        switch cacheRequest.cacheLevel {
        case .base:
            // Cache only deterministic data
            let template = createTemplateFromAnalysis(cacheRequest.analysisData)
            try await cacheService.setAnalysisTemplate(template, ttl: 3600, on: req)
            
        case .partial:
            // Cache base + some agent perspectives
            let template = createTemplateFromAnalysis(cacheRequest.analysisData, includeAgents: true)
            try await cacheService.setAnalysisTemplate(template, ttl: 1800, on: req)
            
        case .full:
            // Cache complete analysis (not recommended)
            req.logger.warning("Full caching requested for \(cacheRequest.symbol) - consider using partial caching")
            try await cacheService.setFullAnalysis(cacheRequest.analysisData, ttl: 900, on: req)
        }
        
        return .ok
    }
    
    // Get cached analysis
    func getCachedAnalysis(req: Request) async throws -> ComprehensiveStockAnalysis? {
        guard let symbol = req.parameters.get("symbol") else {
            throw Abort(.badRequest, reason: "Symbol is required")
        }
        
        let cacheService = req.application.make(CacheService.self)
        return try await cacheService.getFullAnalysis(symbol: symbol, on: req)
    }
    
    // MARK: - Private Methods
    
    private func generateBaseTemplate(symbol: String, on req: Request) async throws -> CachedAnalysisTemplate {
        // This would integrate with your existing data sources
        // For now, returning a mock template
        
        let marketDataService = req.application.make(MarketDataService.self)
        let fundamentals = try await marketDataService.getFundamentals(symbol: symbol, on: req)
        let sentiment = try await marketDataService.getSentiment(symbol: symbol, on: req)
        
        // Generate competitive position using AI
        let competitivePosition = CompetitiveAnalysis(
            marketPosition: "Market Leader",
            competitiveAdvantages: ["Strong brand", "Network effects", "High switching costs"],
            threatsFromCompetitors: ["New entrants", "Tech disruption"],
            barrierToEntry: 8.5,
            switchingCosts: 7.0,
            networkEffects: 9.0,
            brandStrength: 8.0
        )
        
        // Generate base agent perspectives (deterministic parts)
        let baseAgentPerspectives = generateBaseAgentPerspectives(fundamentals: fundamentals)
        
        return CachedAnalysisTemplate(
            symbol: symbol,
            fundamentals: fundamentals,
            marketSentiment: sentiment,
            competitivePosition: competitivePosition,
            baseAgentPerspectives: baseAgentPerspectives,
            cacheTimestamp: Date(),
            ttl: 3600
        )
    }
    
    private func createTemplateFromAnalysis(_ analysis: ComprehensiveStockAnalysis, includeAgents: Bool = false) -> CachedAnalysisTemplate {
        return CachedAnalysisTemplate(
            symbol: analysis.symbol,
            fundamentals: analysis.fundamentalMetrics,
            marketSentiment: MarketSentiment(
                analystRating: 4.0,
                socialSentiment: 0.7,
                newsVolume: 150,
                sentimentTrend: "positive"
            ),
            competitivePosition: analysis.swarmDCF?.competitivePosition ?? CompetitiveAnalysis(
                marketPosition: "Unknown",
                competitiveAdvantages: [],
                threatsFromCompetitors: [],
                barrierToEntry: 5.0,
                switchingCosts: 5.0,
                networkEffects: 5.0,
                brandStrength: 5.0
            ),
            baseAgentPerspectives: includeAgents ? analysis.agentPerspectives : [],
            cacheTimestamp: Date(),
            ttl: 3600
        )
    }
    
    private func generateBaseAgentPerspectives(fundamentals: [String: Double]) -> [AgentPerspective] {
        // Generate deterministic base perspectives based on fundamentals
        let peRatio = fundamentals["P/E Ratio"] ?? 20.0
        let revenueGrowth = fundamentals["Revenue Growth"] ?? 0.0
        
        return [
            AgentPerspective(
                agentType: .fundamental,
                recommendation: peRatio < 15 ? "Buy" : peRatio > 30 ? "Sell" : "Hold",
                targetPrice: 0.0, // Will be calculated on device
                reasoning: "Based on fundamental analysis",
                confidence: 0.8,
                keyPoints: ["P/E ratio analysis", "Revenue growth trends"],
                bias: .neutral
            ),
            AgentPerspective(
                agentType: .technical,
                recommendation: "Hold",
                targetPrice: 0.0,
                reasoning: "Technical indicators suggest consolidation",
                confidence: 0.7,
                keyPoints: ["RSI neutral", "Moving averages converging"],
                bias: .neutral
            )
        ]
    }
}