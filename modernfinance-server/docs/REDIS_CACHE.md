# Redis Caching Service Documentation

## Overview

The Redis caching service provides a robust, type-safe caching layer for the ModernFinance API server. It includes features like TTL management, tag-based invalidation, cache statistics, and automatic retry strategies.

## Installation & Setup

### Prerequisites
- Redis server (version 6.0 or higher recommended)
- Node.js environment

### Installation
```bash
npm install ioredis
```

### Environment Configuration
Add the following to your `.env` file:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password_here
REDIS_DB=0
REDIS_TLS=false
```

## Core Features

### 1. Connection Management
- Automatic connection with retry strategy
- Connection pooling
- Graceful degradation (app continues without cache if Redis is unavailable)

### 2. Type-Safe Operations
- Generic TypeScript interfaces for get/set operations
- JSON serialization/deserialization
- Consistent key generation from objects

### 3. TTL Configuration
Pre-configured TTL values for different cache types:
```typescript
cacheTTL = {
  default: 3600,      // 1 hour
  short: 300,         // 5 minutes
  medium: 1800,       // 30 minutes
  long: 86400,        // 24 hours
  analysis: 7200,     // 2 hours for AI analysis
  stockData: 900,     // 15 minutes for stock data
  companyInfo: 86400, // 24 hours for company info
}
```

### 4. Tag-Based Invalidation
Invalidate multiple cache entries by tags:
```typescript
// Set with tags
await cacheService.set('key', data, {
  tags: ['symbol:AAPL', 'analysis']
});

// Invalidate all entries with tag
await cacheService.invalidateByTags(['symbol:AAPL']);
```

### 5. Cache Statistics
Track cache performance:
```typescript
const stats = cacheService.getStats();
// Returns: { hits, misses, sets, deletes, errors, hitRate }
```

## Usage Examples

### Basic Get/Set
```typescript
// Set value
await cacheService.set('user:123', userData, { ttl: 3600 });

// Get value
const user = await cacheService.get<User>('user:123');
```

### GetOrSet Pattern
```typescript
const data = await cacheService.getOrSet(
  'expensive-operation',
  async () => {
    // This function only runs on cache miss
    return await performExpensiveOperation();
  },
  { ttl: cacheTTL.long }
);
```

### Express Middleware
```typescript
import { cacheMiddleware } from './middleware/cache.middleware';

// Cache all GET requests to this route
router.get('/api/stocks/:symbol', 
  cacheMiddleware('stock', {
    ttl: cacheTTL.stockData,
    tags: (req) => [`symbol:${req.params.symbol}`]
  }),
  stockController.getStock
);

// Invalidate cache on updates
router.put('/api/stocks/:symbol',
  invalidateCacheByTags((req) => [`symbol:${req.params.symbol}`]),
  stockController.updateStock
);
```

### Complex Cache Keys
```typescript
// Object parameters are consistently hashed
const key = cacheService.generateKey(
  'analysis',
  'comparison',
  {
    symbols: ['AAPL', 'GOOGL'],
    metrics: ['revenue', 'profit'],
    startDate: '2024-01-01'
  }
);
```

## Best Practices

### 1. Key Naming Conventions
Use hierarchical, descriptive keys:
```typescript
const cachePrefix = {
  analysis: 'analysis:',
  stock: 'stock:',
  company: 'company:',
  user: 'user:',
  session: 'session:',
  rate: 'rate:',
}
```

### 2. Conditional Caching
Only cache successful responses:
```typescript
if (response.status === 'success' && response.confidence > 0.8) {
  await cacheService.set(key, response, { ttl: cacheTTL.analysis });
}
```

### 3. Cache Warming
Preload frequently accessed data:
```typescript
async function warmCache() {
  const popularSymbols = ['AAPL', 'GOOGL', 'MSFT'];
  
  for (const symbol of popularSymbols) {
    const data = await fetchStockData(symbol);
    await cacheService.set(
      `stock:${symbol}:quote`,
      data,
      { ttl: cacheTTL.stockData }
    );
  }
}
```

### 4. Error Handling
The cache service handles errors gracefully:
```typescript
// If cache fails, the app continues without caching
const cached = await cacheService.get(key); // Returns null on error
await cacheService.set(key, value); // Returns false on error
```

## Monitoring

### Cache Hit Rate
Monitor cache effectiveness:
```typescript
setInterval(async () => {
  const stats = cacheService.getStats();
  console.log(`Cache hit rate: ${stats.hitRate.toFixed(2)}%`);
  
  if (stats.hitRate < 50) {
    console.warn('Low cache hit rate detected');
  }
}, 60000); // Check every minute
```

### Memory Usage
Monitor Redis memory usage:
```bash
redis-cli info memory
```

## Troubleshooting

### Connection Issues
- Check Redis server is running: `redis-cli ping`
- Verify connection settings in `.env`
- Check firewall/network settings

### Performance Issues
- Monitor slow queries: `redis-cli --latency`
- Check key expiration: Too short TTL causes excessive misses
- Review key patterns: Avoid overly complex keys

### Memory Issues
- Set max memory policy: `maxmemory-policy allkeys-lru`
- Monitor memory usage regularly
- Implement cache eviction strategies

## Testing

Run the cache service tests:
```bash
npm test -- src/services/__tests__/cache.service.test.ts
```

## Security Considerations

1. **Authentication**: Always use password authentication in production
2. **TLS**: Enable TLS for encrypted connections
3. **Network**: Restrict Redis access to trusted networks
4. **Data Sensitivity**: Don't cache sensitive unencrypted data

## Performance Tips

1. **Pipeline Operations**: Use Redis pipelines for batch operations
2. **Connection Pooling**: The service uses connection pooling by default
3. **Compression**: Consider compressing large cached values
4. **Appropriate TTLs**: Balance between freshness and performance

## Migration Guide

If migrating from in-memory cache:
1. Install Redis and ioredis
2. Update environment variables
3. Replace cache service imports
4. Test thoroughly in staging environment
5. Monitor performance after deployment