# ModernFinance Server

A Swift Vapor server providing hybrid caching and AI collaboration services for the ModernFinance iOS app.

## Overview

This server implements a smart caching layer that reduces AI API costs by 40-50% while maintaining real-time personalization capabilities on-device. It caches deterministic data like market fundamentals and base AI templates server-side while keeping user-specific insights and real-time collaboration on the iOS app.

## Architecture

### Key Components

- **Swift Vapor**: High-performance web framework
- **Redis**: In-memory caching for fast data retrieval
- **PostgreSQL**: Optional persistent storage for future features
- **Railway**: Deployment platform with no timeout restrictions

### API Endpoints

#### Analysis Endpoints
- `GET /api/v1/analysis/templates/:symbol` - Get cached base analysis template
- `POST /api/v1/analysis/cache` - Cache analysis data
- `GET /api/v1/analysis/cached/:symbol` - Get cached full analysis

#### Market Data Endpoints
- `GET /api/v1/market/fundamentals/:symbol` - Get fundamental metrics
- `GET /api/v1/market/sentiment/:symbol` - Get market sentiment

#### Agent Collaboration Endpoints
- `POST /api/v1/agents/debate/start` - Start agent debate session
- `GET /api/v1/agents/perspectives/:symbol` - Get cached agent perspectives

#### Cache Management
- `GET /api/v1/cache/stats` - Get cache statistics
- `DELETE /api/v1/cache/clear/:symbol` - Clear cache for symbol

## Setup

### Prerequisites

- Swift 5.9+
- Redis
- PostgreSQL (optional)

### Environment Variables

```bash
# Server Configuration
PORT=8080
LOG_LEVEL=info

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DATABASE=0

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/modernfinance

# API Keys
MARKET_DATA_API_KEY=your_api_key
JWT_SECRET=your_jwt_secret
```

### Local Development

1. Install dependencies:
```bash
cd modernfinance-server
swift package resolve
```

2. Run Redis:
```bash
docker run -d -p 6379:6379 redis:alpine
```

3. Run the server:
```bash
swift run
```

The server will start on `http://localhost:8080`

### Testing

Run tests:
```bash
swift test
```

## Deployment on Railway

1. Create a new Railway project
2. Add Redis service
3. Deploy from GitHub repository
4. Set environment variables
5. Server will auto-deploy on push

### Railway Configuration

```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "swift build -c release"

[deploy]
startCommand = ".build/release/Run serve --env production --hostname 0.0.0.0 --port ${PORT}"
healthcheckPath = "/health"
healthcheckTimeout = 30

[nixpacks]
swift_version = "5.9"
```

## Cache Strategy

### What Gets Cached

1. **Base Templates (1 hour TTL)**
   - Market fundamentals
   - Competitive position data
   - Base agent perspectives

2. **Market Data (15 minutes TTL)**
   - Real-time price data
   - Volume metrics
   - Technical indicators

3. **Agent Perspectives (30 minutes TTL)**
   - Deterministic agent analysis
   - Base recommendations

### What Stays On-Device

1. **User Context**
   - Personal insights
   - Custom analysis parameters
   - Real-time collaboration

2. **Sensitive Data**
   - User preferences
   - Authentication tokens
   - Personal notes

## Rate Limiting

- 60 requests per minute per client
- 1000 requests per hour per client
- Headers indicate remaining quota

## Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

### Cache Statistics
```bash
curl http://localhost:8080/api/v1/cache/stats
```

## Security

- JWT authentication for sensitive endpoints
- Rate limiting to prevent abuse
- CORS configured for iOS app
- Request logging for audit trail

## Future Enhancements

1. **Full Agent Collaboration**
   - Move more agent debate to server
   - WebSocket support for real-time updates

2. **Advanced Caching**
   - Predictive cache warming
   - User-specific cache optimization

3. **Analytics**
   - Usage patterns tracking
   - Cost reduction metrics

## Contributing

1. Follow Swift style guidelines
2. Add tests for new features
3. Update documentation
4. Create pull request

## License

Proprietary - ModernFinance