# 🚂 Railway Deployment Guide

## Quick Deploy to Railway

### 1. Push to GitHub
```bash
git add .
git commit -m "Add real data integration"
git push origin main
```

### 2. Deploy on Railway
1. Go to [Railway](https://railway.app)
2. Connect your GitHub repo
3. Railway will auto-deploy

### 3. Add Redis Service
In Railway dashboard:
1. Click "New Service"
2. Select "Database" → "Redis"
3. Railway automatically sets `REDIS_URL`

### 4. Configure Environment Variables
In Railway project settings, add these variables:

```bash
# Required for features (but server works without them)
ALPHA_VANTAGE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Server will use these automatically
NODE_ENV=production
CORS_ORIGINS=*  # Allow all for testing
```

## 🎯 What Works Without Configuration

The server is designed to work immediately on Railway without any API keys:

✅ **Without Alpha Vantage Key:**
- Falls back to Yahoo Finance (no key needed)
- If Yahoo fails, uses intelligent mock data

✅ **Without LLM Keys:**
- Uses data-driven intelligent responses
- Generates realistic agent perspectives based on metrics

✅ **Without Redis:**
- Server continues working without cache
- Just slower response times

## 📱 iOS Client Connection

### For Railway Deployment
Update your iOS app's `HybridCacheService.swift`:

```swift
// Replace with your Railway URL
let productionURL = "https://your-app.railway.app/api/v1"
```

### Testing from iOS Simulator
The server accepts all origins by default (`CORS_ORIGINS=*`), so the iOS simulator can connect from any URL.

## 🔧 Environment Variables (Railway Dashboard)

### Minimal Setup (Works!)
```bash
# Just deploy - no config needed!
# Server uses fallbacks for everything
```

### Recommended Setup
```bash
# Add these in Railway dashboard
ALPHA_VANTAGE_API_KEY=your_free_key
OPENAI_API_KEY=your_key  # Or Anthropic/Google
```

### Full Setup
```bash
NODE_ENV=production
CORS_ORIGINS=*  # Or specific domains later
ALPHA_VANTAGE_API_KEY=your_key
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
GOOGLE_API_KEY=your_key
```

## 🚀 Deployment Steps

### 1. First Deploy (No Config)
```bash
# Just push to GitHub
git push origin main
# Railway auto-deploys
# Server works with mock/Yahoo data
```

### 2. Add Redis (Optional)
- Click "New Service" → "Redis" in Railway
- Railway sets REDIS_URL automatically
- Server auto-connects

### 3. Add API Keys (Optional)
- Go to Variables tab in Railway
- Add ALPHA_VANTAGE_API_KEY
- Add OPENAI_API_KEY
- Redeploy happens automatically

## ✅ Testing Your Deployment

### Test Health Check
```bash
curl https://your-app.railway.app/health
# Should return: OK
```

### Test Market Data (No API Key)
```bash
curl https://your-app.railway.app/api/v1/market/fundamentals/AAPL
# Returns Yahoo Finance or mock data
```

### Test with API Keys
```bash
curl https://your-app.railway.app/api/v1/analysis/templates/AAPL
# Returns real AI perspectives if keys configured
```

## 🎨 Features by Configuration Level

### No Configuration
- ✅ Health checks work
- ✅ Yahoo Finance data (no key needed)
- ✅ Intelligent mock data fallback
- ✅ Basic agent perspectives
- ✅ All endpoints respond

### With Redis Only
- ✅ Everything above PLUS
- ✅ Response caching
- ✅ Faster repeated requests
- ✅ Cache statistics

### With Alpha Vantage Key
- ✅ Everything above PLUS
- ✅ Real-time stock quotes
- ✅ Detailed fundamentals
- ✅ Financial statements
- ✅ Historical data

### With LLM Key (Any One)
- ✅ Everything above PLUS
- ✅ Real AI agent perspectives
- ✅ Dynamic analysis
- ✅ Contribution classification
- ✅ Intelligent responses

## 🐛 Troubleshooting

### "Cannot connect to Redis"
- Normal if Redis not added
- Server works without cache
- Add Redis service in Railway for caching

### "No API keys configured"
- Normal - server works with fallbacks
- Add keys in Railway Variables tab for full features

### "CORS error from iOS"
- Make sure CORS_ORIGINS=* in Railway
- Or add your specific domain

### "Slow responses"
- Normal without Redis cache
- Add Redis service for speed

## 📈 Performance Tips

1. **Start Simple**: Deploy without any config first
2. **Add Redis**: Immediate performance boost
3. **Add One LLM Key**: OpenAI recommended
4. **Add Market Data**: Alpha Vantage for real quotes

## 🔒 Security (Do Later)

For production:
1. Change `CORS_ORIGINS` from `*` to specific domains
2. Add proper JWT authentication
3. Use Railway's secret management
4. Enable rate limiting per user

## 🎉 Success!

Your server is now deployed on Railway and working! Even without any configuration, it provides:
- Real market data (Yahoo Finance)
- Intelligent agent perspectives
- Full API functionality
- iOS app compatibility

Add API keys gradually to unlock more features!