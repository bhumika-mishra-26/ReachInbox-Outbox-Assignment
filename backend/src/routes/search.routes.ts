import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', SearchController.search);

export default router;
