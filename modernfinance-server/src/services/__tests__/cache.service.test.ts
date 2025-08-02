import { cacheService, cacheTTL } from '../cache.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('CacheService', () => {
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Redis instance
    mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      flushdb: jest.fn(),
      quit: jest.fn(),
      smembers: jest.fn(),
      pipeline: jest.fn(),
      on: jest.fn(),
    } as any;
    
    // Mock Redis constructor
    (Redis as any).mockImplementation(() => mockRedis);
    
    // Simulate successful connection
    mockRedis.on.mockImplementation((event: string | symbol, callback: (...args: any[]) => void) => {
      if (event === 'ready') {
        // Simulate ready event
        setTimeout(() => callback(), 0);
      }
      return mockRedis;
    });
    
    // Force service to reinitialize with mocked client
    (cacheService as any).client = mockRedis;
    (cacheService as any).isConnected = true;
    
    // Reset stats
    cacheService.resetStats();
  });

  describe('generateKey', () => {
    it('should generate key from string components', () => {
      const key = cacheService.generateKey('user', '123', 'profile');
      expect(key).toBe('user:123:profile');
    });

    it('should generate key with object component', () => {
      const obj = { b: 2, a: 1 }; // Intentionally unordered
      const key = cacheService.generateKey('cache', obj);
      expect(key).toMatch(/^cache:[a-f0-9]{32}$/); // MD5 hash
    });

    it('should generate consistent keys for same object', () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };
      const key1 = cacheService.generateKey('cache', obj1);
      const key2 = cacheService.generateKey('cache', obj2);
      expect(key1).toBe(key2);
    });
  });

  describe('get', () => {
    it('should return parsed value when key exists', async () => {
      const testData = { id: 1, name: 'Test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');
      
      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('should track hits and misses', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: 'test' }));
      mockRedis.get.mockResolvedValueOnce(null);

      await cacheService.get('hit-key');
      await cacheService.get('miss-key');

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const testData = { id: 1, name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', testData);
      
      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        cacheTTL.default,
        JSON.stringify(testData)
      );
    });

    it('should set value with custom TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('test-key', 'value', { ttl: 300 });
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        JSON.stringify('value')
      );
    });

    it('should handle tags', async () => {
      const mockPipeline = {
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('test-key', 'value', { 
        tags: ['tag1', 'tag2'],
        ttl: 300 
      });

      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:tag1', 'test-key');
      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:tag2', 'test-key');
      expect(mockPipeline.expire).toHaveBeenCalledWith('tag:tag1', 300);
      expect(mockPipeline.expire).toHaveBeenCalledWith('tag:tag2', 300);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.delete('test-key');
      
      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should return false for non-existent key', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await cacheService.delete('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('invalidateByTags', () => {
    it('should delete all keys with given tags', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['key1', 'key2']);
      mockRedis.smembers.mockResolvedValueOnce(['key2', 'key3']);
      mockRedis.del.mockResolvedValue(3);

      const result = await cacheService.invalidateByTags(['tag1', 'tag2']);
      
      expect(result).toBe(3);
      expect(mockRedis.smembers).toHaveBeenCalledWith('tag:tag1');
      expect(mockRedis.smembers).toHaveBeenCalledWith('tag:tag2');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should clean up tag sets after invalidation', async () => {
      mockRedis.smembers.mockResolvedValue(['key1']);
      mockRedis.del.mockResolvedValueOnce(1); // for keys
      mockRedis.del.mockResolvedValueOnce(2); // for tag cleanup

      await cacheService.invalidateByTags(['tag1', 'tag2']);
      
      expect(mockRedis.del).toHaveBeenLastCalledWith('tag:tag1', 'tag:tag2');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { id: 1, cached: true };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const factory = jest.fn().mockResolvedValue({ id: 1, cached: false });
      const result = await cacheService.getOrSet('test-key', factory);
      
      expect(result).toEqual(cachedData);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const newData = { id: 1, fresh: true };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const factory = jest.fn().mockResolvedValue(newData);
      const result = await cacheService.getOrSet('test-key', factory, { ttl: 600 });
      
      expect(result).toEqual(newData);
      expect(factory).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        600,
        JSON.stringify(newData)
      );
    });
  });

  describe('stats', () => {
    it('should track all operations', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify('hit'));
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      await cacheService.get('hit');
      await cacheService.get('miss');
      await cacheService.set('new', 'value');
      await cacheService.delete('old');

      const stats = cacheService.getStats();
      expect(stats).toEqual({
        hits: 1,
        misses: 1,
        sets: 1,
        deletes: 1,
        errors: 0,
        hitRate: 50
      });
    });

    it('should reset stats', () => {
      cacheService.resetStats();
      const stats = cacheService.getStats();
      
      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0
      });
    });
  });
});