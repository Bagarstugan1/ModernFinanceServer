import { Router } from 'express';
import { MarketController } from '../controllers/market.controller';

const router = Router();
const marketController = new MarketController();

// Market data routes
router.get('/fundamentals/:symbol', marketController.getFundamentals);
router.get('/sentiment/:symbol', marketController.getSentiment);

export default router;