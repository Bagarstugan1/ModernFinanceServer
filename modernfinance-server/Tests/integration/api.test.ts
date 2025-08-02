import request from 'supertest';
import app from '../../src/app';

describe('API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/v1', () => {
    it('should return API information', async () => {
      const res = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(res.body).toHaveProperty('message', 'ModernFinance API v1');
      expect(res.body).toHaveProperty('version', '1.0.0');
      expect(res.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/v1/analysis/templates/:symbol', () => {
    it('should return 400 for invalid symbol', async () => {
      const res = await request(app)
        .get('/api/v1/analysis/templates/INVALID!')
        .expect(400);

      expect(res.body.error).toHaveProperty('message', 'Invalid symbol format');
    });
  });

  describe('POST /api/v1/collaboration/classify', () => {
    it('should classify contribution', async () => {
      const res = await request(app)
        .post('/api/v1/collaboration/classify')
        .send({
          contribution: 'I think the revenue growth is too optimistic given market conditions',
          symbol: 'AAPL'
        })
        .expect(200);

      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('confidence');
      expect(res.body).toHaveProperty('keywords');
      expect(res.body).toHaveProperty('suggestedAgents');
    });

    it('should return 400 when contribution is missing', async () => {
      const res = await request(app)
        .post('/api/v1/collaboration/classify')
        .send({ symbol: 'AAPL' })
        .expect(400);

      expect(res.body.error).toHaveProperty('message', 'Contribution text is required');
    });
  });
});