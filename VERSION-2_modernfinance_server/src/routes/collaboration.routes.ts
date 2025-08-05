import { Router } from 'express';
import { CollaborationController } from '../controllers/collaboration.controller';

const router = Router();
const collaborationController = new CollaborationController();

// Collaboration routes
router.post('/classify', collaborationController.classifyContribution);
router.get('/templates/:agentType/:contributionType', collaborationController.getAgentTemplates);
router.post('/agents/relevant', collaborationController.getRelevantAgents);

export default router;