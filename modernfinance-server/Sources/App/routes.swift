import Vapor

func routes(_ app: Application) throws {
    app.get { req async in
        return ["status": "healthy", "service": "ModernFinance Server", "version": "1.0.0"]
    }
    
    app.get("health") { req async in
        return HTTPStatus.ok
    }
    
    // API versioning
    let api = app.grouped("api", "v1")
    
    // Analysis endpoints
    let analysisController = AnalysisController()
    api.get("analysis", "templates", ":symbol", use: analysisController.getBaseTemplate)
    api.post("analysis", "cache", use: analysisController.cacheAnalysisData)
    api.get("analysis", "cached", ":symbol", use: analysisController.getCachedAnalysis)
    
    // Market data endpoints
    let marketController = MarketDataController()
    api.get("market", "fundamentals", ":symbol", use: marketController.getFundamentals)
    api.get("market", "sentiment", ":symbol", use: marketController.getSentiment)
    
    // Agent collaboration endpoints
    let agentController = AgentCollaborationController()
    api.post("agents", "debate", "start", use: agentController.startDebate)
    api.get("agents", "perspectives", ":symbol", use: agentController.getCachedPerspectives)
    
    // Cache management
    let cacheController = CacheController()
    api.get("cache", "stats", use: cacheController.getStats)
    api.delete("cache", "clear", ":symbol", use: cacheController.clearSymbolCache)
}