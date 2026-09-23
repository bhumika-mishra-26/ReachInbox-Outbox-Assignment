import { Router } from 'express';
import { z } from 'zod';
import { AuthLocalController } from '../controllers/auth.local.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

const registerSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().optional(),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
};

router.post('/register', validateRequest(registerSchema), AuthLocalController.register);
router.post('/login', validateRequest(loginSchema), AuthLocalController.login);
router.post('/logout', AuthLocalController.logout);
router.get('/me', authMiddleware, AuthLocalController.getMe);

export default router;
