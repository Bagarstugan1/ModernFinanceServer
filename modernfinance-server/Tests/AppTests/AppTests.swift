@testable import App
import XCTVapor

final class AppTests: XCTestCase {
    var app: Application!
    
    override func setUpWithError() throws {
        app = Application(.testing)
        try configure(app)
    }
    
    override func tearDownWithError() throws {
        app.shutdown()
    }
    
    func testHealthEndpoint() throws {
        try app.test(.GET, "health") { res in
            XCTAssertEqual(res.status, .ok)
        }
    }
    
    func testRootEndpoint() throws {
        try app.test(.GET, "/") { res in
            XCTAssertEqual(res.status, .ok)
            let response = try res.content.decode([String: String].self)
            XCTAssertEqual(response["status"], "healthy")
            XCTAssertEqual(response["service"], "ModernFinance Server")
        }
    }
    
    func testGetAnalysisTemplateRequiresSymbol() throws {
        try app.test(.GET, "api/v1/analysis/templates/") { res in
            XCTAssertEqual(res.status, .notFound)
        }
    }
    
    func testGetFundamentalsWithSymbol() throws {
        try app.test(.GET, "api/v1/analysis/templates/AAPL") { res in
            XCTAssertEqual(res.status, .ok)
            let template = try res.content.decode(CachedAnalysisTemplate.self)
            XCTAssertEqual(template.symbol, "AAPL")
            XCTAssertFalse(template.fundamentals.isEmpty)
        }
    }
    
    func testRateLimitHeaders() throws {
        try app.test(.GET, "/") { res in
            XCTAssertEqual(res.status, .ok)
            XCTAssertNotNil(res.headers["X-RateLimit-Limit-Minute"].first)
            XCTAssertNotNil(res.headers["X-RateLimit-Remaining-Minute"].first)
        }
    }
    
    func testCacheStatsEndpoint() throws {
        try app.test(.GET, "api/v1/cache/stats") { res in
            XCTAssertEqual(res.status, .ok)
            let stats = try res.content.decode(CacheStats.self)
            XCTAssertGreaterThanOrEqual(stats.totalKeys, 0)
            XCTAssertGreaterThanOrEqual(stats.hitRate, 0.0)
            XCTAssertLessThanOrEqual(stats.hitRate, 1.0)
        }
    }
}