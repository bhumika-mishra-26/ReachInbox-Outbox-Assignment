import { Router } from 'express';
import { z } from 'zod';
import { EmailController } from '../controllers/email.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

// Public standalone route for HTML email preview (matches Ethereal style public link)
router.get('/:id/preview', EmailController.renderPreview);

// Protect all remaining email endpoints with auth
router.use(authMiddleware);

const scheduleSchema = {
  body: z.object({
    recipients: z.array(z.string().email('Invalid email recipient')).min(1, 'At least one recipient is required'),
    subject: z.string().min(1, 'Subject is required'),
    body: z.string().min(1, 'Email body is required'),
    startTime: z.string().optional(),
    scheduledFor: z.string().optional(),
    delayBetweenEmailsMs: z.coerce.number().min(0).optional(),
    delayBetweenEmailsSeconds: z.coerce.number().min(0).optional(),
    hourlyLimit: z.coerce.number().min(1).optional(),
    senderId: z.string().optional(),
    attachments: z.array(z.any()).optional(),
  }),
};

router.post('/schedule', validateRequest(scheduleSchema), EmailController.schedule);
router.get('/scheduled', EmailController.getScheduled);
router.get('/sent', EmailController.getSent);
router.get('/stats', EmailController.getStats);
router.delete('/:id', EmailController.cancel);

export default router;
