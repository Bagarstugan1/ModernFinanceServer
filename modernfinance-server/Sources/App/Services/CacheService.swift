import Vapor
import Redis
import Foundation

final class CacheService {
    let app: Application
    
    init(_ app: Application) {
        self.app = app
    }
    
    // MARK: - Analysis Template Caching
    
    func getAnalysisTemplate(symbol: String, on req: Request) async throws -> CachedAnalysisTemplate? {
        let key = cacheKey(for: symbol, type: "template")
        
        guard let data = try await req.redis.get(RedisKey(key), as: Data.self).get() else {
            return nil
        }
        
        return try JSONDecoder().decode(CachedAnalysisTemplate.self, from: data)
    }
    
    func setAnalysisTemplate(_ template: CachedAnalysisTemplate, ttl: Int, on req: Request) async throws {
        let key = cacheKey(for: template.symbol, type: "template")
        let data = try JSONEncoder().encode(template)
        
        try await req.redis.setex(
            RedisKey(key),
            to: data,
            expirationInSeconds: ttl
        ).get()
        
        // Update cache stats
        try await incrementCacheStats(symbol: template.symbol, on: req)
    }
    
    // MARK: - Full Analysis Caching
    
    func getFullAnalysis(symbol: String, on req: Request) async throws -> ComprehensiveStockAnalysis? {
        let key = cacheKey(for: symbol, type: "full")
        
        guard let data = try await req.redis.get(RedisKey(key), as: Data.self).get() else {
            return nil
        }
        
        return try JSONDecoder().decode(ComprehensiveStockAnalysis.self, from: data)
    }
    
    func setFullAnalysis(_ analysis: ComprehensiveStockAnalysis, ttl: Int, on req: Request) async throws {
        let key = cacheKey(for: analysis.symbol, type: "full")
        let data = try JSONEncoder().encode(analysis)
        
        try await req.redis.setex(
            RedisKey(key),
            to: data,
            expirationInSeconds: ttl
        ).get()
    }
    
    // MARK: - Market Data Caching
    
    func getFundamentals(symbol: String, on req: Request) async throws -> [String: Double]? {
        let key = cacheKey(for: symbol, type: "fundamentals")
        
        guard let data = try await req.redis.get(RedisKey(key), as: Data.self).get() else {
            return nil
        }
        
        return try JSONDecoder().decode([String: Double].self, from: data)
    }
    
    func setFundamentals(_ fundamentals: [String: Double], symbol: String, ttl: Int, on req: Request) async throws {
        let key = cacheKey(for: symbol, type: "fundamentals")
        let data = try JSONEncoder().encode(fundamentals)
        
        try await req.redis.setex(
            RedisKey(key),
            to: data,
            expirationInSeconds: ttl
        ).get()
    }
    
    // MARK: - Agent Perspectives Caching
    
    func getAgentPerspectives(symbol: String, on req: Request) async throws -> [AgentPerspective]? {
        let key = cacheKey(for: symbol, type: "agents")
        
        guard let data = try await req.redis.get(RedisKey(key), as: Data.self).get() else {
            return nil
        }
        
        return try JSONDecoder().decode([AgentPerspective].self, from: data)
    }
    
    func setAgentPerspectives(_ perspectives: [AgentPerspective], symbol: String, ttl: Int, on req: Request) async throws {
        let key = cacheKey(for: symbol, type: "agents")
        let data = try JSONEncoder().encode(perspectives)
        
        try await req.redis.setex(
            RedisKey(key),
            to: data,
            expirationInSeconds: ttl
        ).get()
    }
    
    // MARK: - Cache Management
    
    func clearSymbolCache(symbol: String, on req: Request) async throws {
        let patterns = [
            cacheKey(for: symbol, type: "template"),
            cacheKey(for: symbol, type: "full"),
            cacheKey(for: symbol, type: "fundamentals"),
            cacheKey(for: symbol, type: "agents"),
            cacheKey(for: symbol, type: "sentiment")
        ]
        
        for pattern in patterns {
            _ = try await req.redis.delete(RedisKey(pattern)).get()
        }
        
        req.logger.info("Cleared cache for symbol: \(symbol)")
    }
    
    func getCacheStats(on req: Request) async throws -> CacheStats {
        let info = try await req.redis.send(command: "INFO", with: ["memory"]).get()
        
        // Parse Redis info
        let usedMemory = parseRedisInfo(info.string ?? "", key: "used_memory_human") ?? "0"
        let totalKeys = try await req.redis.send(command: "DBSIZE").get().int ?? 0
        
        // Get hit/miss ratio from stored stats
        let hits = try await req.redis.get(RedisKey("stats:hits"), as: Int.self).get() ?? 0
        let misses = try await req.redis.get(RedisKey("stats:misses"), as: Int.self).get() ?? 0
        let hitRate = hits + misses > 0 ? Double(hits) / Double(hits + misses) : 0.0
        
        return CacheStats(
            totalKeys: totalKeys,
            usedMemory: usedMemory,
            hitRate: hitRate,
            activeSymbols: try await getActiveSymbols(on: req),
            uptime: Date().timeIntervalSince(app.bootTime)
        )
    }
    
    // MARK: - Private Methods
    
    private func cacheKey(for symbol: String, type: String) -> String {
        return "mf:\(type):\(symbol.uppercased())"
    }
    
    private func incrementCacheStats(symbol: String, on req: Request) async throws {
        _ = try await req.redis.increment(RedisKey("stats:hits")).get()
        _ = try await req.redis.sadd(symbol, to: RedisKey("stats:symbols")).get()
    }
    
    private func getActiveSymbols(on req: Request) async throws -> [String] {
        return try await req.redis.smembers(of: RedisKey("stats:symbols"), as: String.self).get()
    }
    
    private func parseRedisInfo(_ info: String, key: String) -> String? {
        let lines = info.split(separator: "\n")
        for line in lines {
            let parts = line.split(separator: ":")
            if parts.count == 2 && parts[0] == key {
                return String(parts[1])
            }
        }
        return nil
    }
}

// MARK: - Cache Stats Model

struct CacheStats: Content {
    let totalKeys: Int
    let usedMemory: String
    let hitRate: Double
    let activeSymbols: [String]
    let uptime: TimeInterval
}

// MARK: - Application Extension

extension Application {
    var bootTime: Date {
        return Date() // In production, store this when app starts
    }
    
    func make(_ service: CacheService.Type) -> CacheService {
        return CacheService(self)
    }
}