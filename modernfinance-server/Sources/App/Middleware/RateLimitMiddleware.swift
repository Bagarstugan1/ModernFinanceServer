import Vapor
import Redis

final class RateLimitMiddleware: AsyncMiddleware {
    private let requestsPerMinute: Int
    private let requestsPerHour: Int
    
    init(requestsPerMinute: Int = 60, requestsPerHour: Int = 1000) {
        self.requestsPerMinute = requestsPerMinute
        self.requestsPerHour = requestsPerHour
    }
    
    func respond(to request: Request, chainingTo next: AsyncResponder) async throws -> Response {
        // Get client identifier (IP or API key)
        let clientId = getClientIdentifier(from: request)
        
        // Check rate limits
        let minuteKey = "rate:minute:\(clientId)"
        let hourKey = "rate:hour:\(clientId)"
        
        // Check minute limit
        let minuteCount = try await request.redis.incr(RedisKey(minuteKey)).get()
        if minuteCount == 1 {
            // Set expiry for first request
            _ = try await request.redis.expire(RedisKey(minuteKey), after: .seconds(60)).get()
        }
        
        if minuteCount > requestsPerMinute {
            throw Abort(.tooManyRequests, reason: "Rate limit exceeded: \(requestsPerMinute) requests per minute")
        }
        
        // Check hour limit
        let hourCount = try await request.redis.incr(RedisKey(hourKey)).get()
        if hourCount == 1 {
            // Set expiry for first request
            _ = try await request.redis.expire(RedisKey(hourKey), after: .seconds(3600)).get()
        }
        
        if hourCount > requestsPerHour {
            throw Abort(.tooManyRequests, reason: "Rate limit exceeded: \(requestsPerHour) requests per hour")
        }
        
        // Add rate limit headers
        let response = try await next.respond(to: request)
        response.headers.add(name: "X-RateLimit-Limit-Minute", value: "\(requestsPerMinute)")
        response.headers.add(name: "X-RateLimit-Remaining-Minute", value: "\(requestsPerMinute - Int(minuteCount))")
        response.headers.add(name: "X-RateLimit-Limit-Hour", value: "\(requestsPerHour)")
        response.headers.add(name: "X-RateLimit-Remaining-Hour", value: "\(requestsPerHour - Int(hourCount))")
        
        return response
    }
    
    private func getClientIdentifier(from request: Request) -> String {
        // Try to get API key first
        if let apiKey = request.headers["X-API-Key"].first {
            return "api:\(apiKey)"
        }
        
        // Fall back to IP address
        return "ip:\(request.remoteAddress?.hostname ?? "unknown")"
    }
}