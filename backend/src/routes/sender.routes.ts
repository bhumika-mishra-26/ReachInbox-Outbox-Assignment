import { Router } from 'express';
import { z } from 'zod';
import { SenderController } from '../controllers/sender.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

router.use(authMiddleware);

const createSenderSchema = {
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    host: z.string().min(1),
    port: z.coerce.number(),
    secure: z.boolean().default(false),
    user: z.string().min(1),
    pass: z.string().min(1),
    hourlyLimit: z.coerce.number().min(1).default(200),
    minDelayMs: z.coerce.number().min(0).default(2000),
  }),
};

router.get('/', SenderController.getSenders);
router.post('/', validateRequest(createSenderSchema), SenderController.createSender);
router.post('/ethereal', SenderController.createEtherealSender);
router.patch('/:id', SenderController.updateSender);
router.delete('/:id', SenderController.deleteSender);

export default router;
