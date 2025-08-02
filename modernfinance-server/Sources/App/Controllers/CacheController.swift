import Vapor

struct CacheController {
    
    // Get cache statistics
    func getStats(req: Request) async throws -> CacheStats {
        let cacheService = req.application.make(CacheService.self)
        return try await cacheService.getCacheStats(on: req)
    }
    
    // Clear cache for a specific symbol
    func clearSymbolCache(req: Request) async throws -> HTTPStatus {
        guard let symbol = req.parameters.get("symbol") else {
            throw Abort(.badRequest, reason: "Symbol is required")
        }
        
        let cacheService = req.application.make(CacheService.self)
        try await cacheService.clearSymbolCache(symbol: symbol, on: req)
        
        req.logger.info("Cache cleared for symbol: \(symbol)")
        return .ok
    }
}