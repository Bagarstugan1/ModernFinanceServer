import Vapor

struct MarketDataController {
    
    // Get fundamental data for a symbol
    func getFundamentals(req: Request) async throws -> [String: Double] {
        guard let symbol = req.parameters.get("symbol") else {
            throw Abort(.badRequest, reason: "Symbol is required")
        }
        
        let cacheService = req.application.make(CacheService.self)
        let marketDataService = req.application.make(MarketDataService.self)
        
        // Check cache first
        if let cached = try await cacheService.getFundamentals(symbol: symbol, on: req) {
            req.logger.info("Fundamentals cache hit for: \(symbol)")
            return cached
        }
        
        // Fetch from market data provider
        req.logger.info("Fetching fundamentals for: \(symbol)")
        let fundamentals = try await marketDataService.getFundamentals(symbol: symbol, on: req)
        
        // Cache for 15 minutes
        try await cacheService.setFundamentals(fundamentals, symbol: symbol, ttl: 900, on: req)
        
        return fundamentals
    }
    
    // Get market sentiment for a symbol
    func getSentiment(req: Request) async throws -> MarketSentiment {
        guard let symbol = req.parameters.get("symbol") else {
            throw Abort(.badRequest, reason: "Symbol is required")
        }
        
        let marketDataService = req.application.make(MarketDataService.self)
        return try await marketDataService.getSentiment(symbol: symbol, on: req)
    }
}