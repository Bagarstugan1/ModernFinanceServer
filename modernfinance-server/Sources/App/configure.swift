import Fluent
import FluentPostgresDriver
import Redis
import Vapor
import JWT

public func configure(_ app: Application) throws {
    // Configure server
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = Environment.get("PORT").flatMap(Int.init(_:)) ?? 8080
    
    // Configure file middleware
    app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))
    
    // Configure CORS
    let corsConfiguration = CORSMiddleware.Configuration(
        allowedOrigin: .all,
        allowedMethods: [.GET, .POST, .PUT, .OPTIONS, .DELETE, .PATCH],
        allowedHeaders: [.accept, .authorization, .contentType, .origin, .xRequestedWith, .userAgent, .accessControlAllowOrigin]
    )
    app.middleware.use(CORSMiddleware(configuration: corsConfiguration))
    
    // Configure Redis
    app.redis.configuration = try RedisConfiguration(
        hostname: Environment.get("REDIS_HOST") ?? "localhost",
        port: Environment.get("REDIS_PORT").flatMap(Int.init) ?? 6379,
        password: Environment.get("REDIS_PASSWORD"),
        database: Environment.get("REDIS_DATABASE").flatMap(Int.init) ?? 0
    )
    
    // Configure PostgreSQL (optional for future features)
    if let databaseURL = Environment.get("DATABASE_URL") {
        app.databases.use(try .postgres(url: databaseURL), as: .psql)
    }
    
    // Configure JWT
    app.jwt.signers.use(.hs256(key: Environment.get("JWT_SECRET") ?? "modernfinance-secret-key"))
    
    // Configure logging
    app.logger.logLevel = Environment.get("LOG_LEVEL")
        .flatMap { Logger.Level(rawValue: $0) } ?? .info
    
    // Configure routes
    try routes(app)
    
    // Configure services
    app.lifecycle.use(CacheWarmupService())
    
    // Configure rate limiting
    app.middleware.use(RateLimitMiddleware())
    
    // Configure request logging
    app.middleware.use(RequestLoggingMiddleware())
}