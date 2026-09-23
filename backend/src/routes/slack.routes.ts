import { Router } from 'express';
import { SlackController } from '../controllers/slack.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Connect route initiates OAuth redirect (needs auth to know user)
router.get('/connect', authMiddleware, SlackController.connect);

// Callback from Slack OAuth (public GET redirect)
router.get('/callback', SlackController.callback);

// Slack connection status
router.get('/status', authMiddleware, SlackController.getStatus);

// Disconnect integration
router.post('/disconnect', authMiddleware, SlackController.disconnect);

// Trigger a test alert to verify webhook in Slack
router.post('/test', authMiddleware, SlackController.testAlert);

export default router;
