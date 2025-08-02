# ModernFinance Server Deployment Guide

## 🚀 Quick Railway Deployment

### Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Redis instance (Railway provides this)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add Node.js server for ModernFinance"
git push origin main
```

### Step 2: Deploy on Railway
1. Log in to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js and use `railway-node.toml`
5. Add Redis service:
   - Click "New" → "Database" → "Redis"
   - Railway will automatically inject Redis connection vars

### Step 3: Configure Environment Variables
In Railway dashboard, add these variables:
```
NODE_ENV=production
JWT_SECRET=<generate-secure-secret>
ALLOWED_ORIGINS=https://your-ios-app.com
```

### Step 4: Update iOS Client
Update your iOS app's `HybridCacheService.swift`:
```swift
#if DEBUG
self.baseURL = "http://localhost:8080/api/v1"
#else
self.baseURL = "https://your-app-name.up.railway.app/api/v1"
#endif
```

## 📋 Available Endpoints

### Health Check
- `GET /health` - Server health status

### Analysis
- `GET /api/v1/analysis/templates/:symbol` - Get cached base template
- `POST /api/v1/analysis/cache` - Cache analysis data
- `GET /api/v1/analysis/cached/:symbol` - Get cached analysis

### Market Data
- `GET /api/v1/market/fundamentals/:symbol` - Get fundamentals with caching
- `GET /api/v1/market/sentiment/:symbol` - Get sentiment data

### Collaboration
- `POST /api/v1/collaboration/classify` - Classify user contribution
- `GET /api/v1/collaboration/templates/:agent/:type` - Get response templates
- `POST /api/v1/collaboration/agents/relevant` - Get relevant agents

### Cache Management
- `GET /api/v1/cache/stats` - Cache statistics
- `DELETE /api/v1/cache/clear/:symbol` - Clear symbol cache

## 🔧 Local Development

### Install Dependencies
```bash
npm install
```

### Set Up Environment
```bash
cp .env.example .env
# Edit .env with your local config
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run start:prod
```

## 🎯 Performance Expectations

- **Response Time**: <50ms for cached requests
- **Cache Hit Rate**: 70-80% after warm-up
- **Memory Usage**: ~100MB baseline + cache
- **Concurrent Requests**: 1000+ req/min

## 🛡️ Security Notes

1. Always use HTTPS in production
2. Rotate JWT_SECRET regularly
3. Configure CORS properly for your iOS app
4. Use Railway's built-in SSL certificates

## 📊 Monitoring

Railway provides:
- Deployment logs
- Resource usage metrics
- Crash reporting
- Custom domain support

Access logs:
```bash
railway logs
```

## 🚨 Troubleshooting

### Redis Connection Issues
- Check Redis service is running in Railway
- Verify REDIS_* env vars are set

### CORS Errors
- Update ALLOWED_ORIGINS in env vars
- Ensure iOS app uses correct URL

### Build Failures
- Check Node version (requires 18+)
- Verify all dependencies installed
- Check TypeScript compilation: `npm run typecheck`

## 🎉 Success Metrics

Your server is working when:
- Health endpoint returns 200 OK
- Cache hit rate > 50%
- iOS app shows "Connected to cache server"
- Response times < 100ms

Happy deploying! 🚀