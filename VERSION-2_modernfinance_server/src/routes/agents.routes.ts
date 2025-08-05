import { Router } from 'express';
import { analysisController } from '../controllers/analysis.controller';

const router = Router();

// Agent perspective routes
router.get('/perspectives/:symbol', analysisController.getCachedAgentPerspectives);

export default router;