import { Router } from 'express';
import { CacheController } from '../controllers/cache.controller';

const router = Router();
const cacheController = new CacheController();

// Cache management routes
router.get('/stats', cacheController.getStats);
router.delete('/clear/:symbol', cacheController.clearSymbol);

export default router;