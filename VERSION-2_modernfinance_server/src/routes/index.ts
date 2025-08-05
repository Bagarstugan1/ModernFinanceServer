import { Router } from 'express';
import analysisRoutes from './analysis.routes';
import marketRoutes from './market.routes';
import collaborationRoutes from './collaboration.routes';
import cacheRoutes from './cache.routes';
import agentsRoutes from './agents.routes';

const router = Router();

// Mount route modules
router.use('/analysis', analysisRoutes);
router.use('/market', marketRoutes);
router.use('/collaboration', collaborationRoutes);
router.use('/cache', cacheRoutes);
router.use('/agents', agentsRoutes);

// Root endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'ModernFinance API v1',
    version: '1.0.0',
    endpoints: {
      analysis: '/api/v1/analysis',
      market: '/api/v1/market',
      collaboration: '/api/v1/collaboration',
      cache: '/api/v1/cache',
      health: '/health'
    }
  });
});

export default router;