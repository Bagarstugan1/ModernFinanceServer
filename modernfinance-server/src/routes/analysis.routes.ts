import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller';

const router = Router();
const analysisController = new AnalysisController();

// Analysis routes
router.get('/templates/:symbol', analysisController.getBaseTemplate);
router.post('/cache', analysisController.cacheAnalysisData);
router.get('/cached/:symbol', analysisController.getCachedAnalysis);

export default router;