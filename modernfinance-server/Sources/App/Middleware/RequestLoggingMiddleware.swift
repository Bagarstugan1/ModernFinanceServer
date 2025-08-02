import Vapor
import Foundation

final class RequestLoggingMiddleware: AsyncMiddleware {
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        let start = Date()
        let method = request.method.rawValue
        let path = request.url.path
        let clientId = getClientIdentifier(from: request)
        
        request.logger.info("[\(method)] \(path) - Client: \(clientId)")
        
        do {
            let response = try await next.respond(to: request)
            let duration = Date().timeIntervalSince(start)
            
            request.logger.info(
                "[\(method)] \(path) - Status: \(response.status.code) - Duration: \(String(format: "%.3f", duration))s"
            )
            
            // Track metrics
            try await trackMetrics(
                method: method,
                path: path,
                status: response.status.code,
                duration: duration,
                on: request
            )
            
            return response
        } catch {
            let duration = Date().timeIntervalSince(start)
            
            request.logger.error(
                "[\(method)] \(path) - Error: \(error) - Duration: \(String(format: "%.3f", duration))s"
            )
            
            // Track error metrics
            try await trackMetrics(
                method: method,
                path: path,
                status: 500,
                duration: duration,
                on: request
            )
            
            throw error
        }
    }
    
    private func getClientIdentifier(from request: Request) -> String {
        if let apiKey = request.headers["X-API-Key"].first {
            return String(apiKey.prefix(8)) + "***"
        }
        return request.remoteAddress?.hostname ?? "unknown"
    }
    
    private func trackMetrics(
        method: String,
        path: String,
        status: UInt,
        duration: TimeInterval,
        on request: Request
    ) async throws {
        // Sanitize path for metrics (remove specific IDs)
        let sanitizedPath = path
            .replacingOccurrences(of: #"\/[A-Z0-9]{1,10}(\/|$)"#, with: "/:id$1", options: .regularExpression)
        
        let metricsKey = "metrics:\(method):\(sanitizedPath):\(status)"
        _ = try await request.redis.incr(RedisKey(metricsKey)).get()
        
        // Track response time percentiles
        let responseTimeKey = "metrics:response_time:\(sanitizedPath)"
        _ = try await request.redis.zadd(
            [(Int(duration * 1000), Date().timeIntervalSince1970)],
            to: RedisKey(responseTimeKey)
        ).get()
        
        // Clean up old response time data (keep last hour)
        let cutoff = Date().timeIntervalSince1970 - 3600
        _ = try await request.redis.zremrangebyscore(
            from: RedisKey(responseTimeKey),
            min: "-inf",
            max: String(cutoff)
        ).get()
    }
}