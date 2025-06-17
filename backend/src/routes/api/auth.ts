import { Router } from 'express';
import { login, register, me } from '../../controllers/authController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/login', login);
router.post('/register', register);

// Rotas protegidas
router.get('/me', authenticateToken, me);

export default router;