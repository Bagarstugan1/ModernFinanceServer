# ModernFinance Server - Real Data Setup Guide

## ✅ What's Been Implemented

### 1. Real Market Data Integration
- **Alpha Vantage Service**: Primary data source for stock quotes, fundamentals, and financial statements
- **Yahoo Finance Service**: Fallback data source when Alpha Vantage fails or hits rate limits
- **Smart Fallback Logic**: Automatically switches between data sources with caching

### 2. Real AI Integration
- **Multi-Provider LLM Service**: Supports OpenAI, Anthropic, and Google Gemini
- **Real Agent Perspectives**: AI-generated analysis from 5 different agent types
- **Intelligent Fallback**: Falls back to data-driven mock responses if all LLMs fail
- **Collaboration AI**: Real-time classification of user contributions

### 3. Fixed Cache Implementation
- **Proper Agent Perspective Storage**: Fixed cache storage and retrieval
- **Multi-Level Caching**: BASE, PARTIAL, and FULL cache levels
- **Tag-Based Invalidation**: Efficient cache management
- **Client-Compatible Endpoints**: `/api/v1/agents/perspectives/:symbol` now works

## 🚀 Quick Start

### Prerequisites
1. **Node.js 20.x** installed
2. **Redis** running locally (or use Docker)
3. **API Keys** (at least one of each):
   - Alpha Vantage API key (free)
   - OpenAI, Anthropic, or Google API key

### Step 1: Install Redis (if not installed)
```bash
# macOS
brew install redis
brew services start redis

# Or use Docker
docker run -d -p 6379:6379 redis
```

### Step 2: Configure Environment
1. The `.env` file has been created with placeholders
2. Edit `.env` and add your API keys:
```bash
# Required for real market data
ALPHA_VANTAGE_API_KEY=your_actual_key_here

# At least one LLM key (OpenAI recommended)
OPENAI_API_KEY=your_actual_key_here
```

### Step 3: Install Dependencies
```bash
cd modernfinance-server
npm install
```

### Step 4: Run the Server
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Step 5: Verify It's Working
```bash
# Test market data endpoint
curl http://localhost:8080/api/v1/market/fundamentals/AAPL

# Test analysis template (with AI perspectives)
curl http://localhost:8080/api/v1/analysis/templates/AAPL

# Test agent perspectives
curl http://localhost:8080/api/v1/agents/perspectives/AAPL
```

## 🔑 Getting API Keys

### Alpha Vantage (Required for Market Data)
1. Go to: https://www.alphavantage.co/support/#api-key
2. Enter your email
3. Get free API key instantly
4. Add to `.env`: `ALPHA_VANTAGE_API_KEY=your_key`

### OpenAI (Recommended for AI)
1. Go to: https://platform.openai.com/api-keys
2. Sign up/login
3. Create new API key
4. Add to `.env`: `OPENAI_API_KEY=your_key`

### Anthropic (Alternative)
1. Go to: https://console.anthropic.com/settings/keys
2. Sign up/login
3. Create API key
4. Add to `.env`: `ANTHROPIC_API_KEY=your_key`

### Google Gemini (Alternative)
1. Go to: https://makersuite.google.com/app/apikey
2. Sign up/login
3. Create API key
4. Add to `.env`: `GOOGLE_API_KEY=your_key`

## 📱 iOS Client Configuration

The iOS client should automatically connect to the server at `http://localhost:8080/api/v1`

If you need to change the server URL:
1. In the iOS app, update `HybridCacheService.swift`
2. Change the `baseURL` to your server address

## 🧪 Testing the Integration

### Test Real Market Data
```bash
# Should return real AAPL data from Alpha Vantage
curl http://localhost:8080/api/v1/market/fundamentals/AAPL | jq .
```

### Test AI Agent Perspectives
```bash
# Should return 5 AI-generated perspectives
curl http://localhost:8080/api/v1/analysis/templates/AAPL | jq '.baseAgentPerspectives'
```

### Test Cache
```bash
# First request will be slow (generates fresh data)
time curl http://localhost:8080/api/v1/analysis/templates/TSLA

# Second request should be fast (cached)
time curl http://localhost:8080/api/v1/analysis/templates/TSLA
```

## 📊 What You Should See

### Real Market Data Response
```json
{
  "Market Cap": 2950000000000,
  "P/E Ratio": 32.5,
  "Revenue": 383285000000,
  "Revenue Growth": 0.08,
  // ... real financial metrics
}
```

### Real AI Agent Perspective
```json
{
  "agentType": "Fundamental Analyst",
  "recommendation": "Buy",
  "targetPrice": 225.50,
  "reasoning": "Strong fundamentals with consistent revenue growth...",
  "confidence": 0.85,
  "keyPoints": [
    "P/E ratio of 32.5 reasonable for growth profile",
    "Revenue growth of 8% year-over-year",
    // ... specific data-driven insights
  ],
  "bias": "Bullish"
}
```

## 🐛 Troubleshooting

### "No API key configured"
- Make sure you've added API keys to `.env`
- Restart the server after adding keys

### "Redis connection failed"
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check Redis port in `.env` matches your Redis configuration

### "Alpha Vantage rate limit"
- Free tier limited to 5 requests/minute
- Server automatically falls back to Yahoo Finance
- Consider upgrading Alpha Vantage plan for production

### "LLM timeout"
- Normal for first requests (model loading)
- Server will retry with different providers
- Falls back to intelligent mock if all fail

## 📈 Performance Tips

1. **Cache Warming**: Pre-fetch popular symbols on startup
2. **Rate Limiting**: Be mindful of Alpha Vantage's 5 req/min limit
3. **LLM Costs**: Monitor OpenAI usage to control costs
4. **Redis Memory**: Monitor Redis memory usage for large deployments

## 🔒 Security Notes

1. **Never commit `.env`**: It's already in `.gitignore`
2. **Use environment variables** in production
3. **Enable HTTPS** for production deployment
4. **Add authentication** before deploying publicly

## 🎉 Success Checklist

- [ ] Redis is running
- [ ] `.env` has Alpha Vantage API key
- [ ] `.env` has at least one LLM API key
- [ ] Server starts without errors
- [ ] `/api/v1/market/fundamentals/AAPL` returns real data
- [ ] `/api/v1/analysis/templates/AAPL` returns AI perspectives
- [ ] iOS app connects and shows real stock data
- [ ] Agent perspectives appear in the app
- [ ] Collaboration features work with AI classification

## 📝 Next Steps

The server is now fully functional with:
- ✅ Real market data from Alpha Vantage/Yahoo Finance
- ✅ Real AI agent perspectives from OpenAI/Anthropic/Google
- ✅ Working cache system with proper perspective storage
- ✅ Real-time collaboration with AI classification

For production deployment:
1. Add authentication (JWT)
2. Enable HTTPS
3. Set up monitoring (Prometheus/Grafana)
4. Configure production Redis
5. Use environment secrets management

Enjoy your fully functional AI-powered stock analysis server! 🚀