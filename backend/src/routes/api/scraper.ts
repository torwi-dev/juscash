import { Router } from 'express';
import {
  createExecution,
  updateExecution,
  getExecutions,
  getExecutionById,
  getExecutionStats,
  completeExecution,
  failExecution,
  getTodayExecution,
  getExecutionByDate
} from '../../controllers/scraperController';
import { authenticateToken, requireRole } from '../../middleware/auth';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Rotas específicas primeiro
router.get('/stats', requireRole(['admin']), getExecutionStats);
router.get('/today', requireRole(['admin', 'scraper_service']), getTodayExecution);
router.get('/by-date', requireRole(['admin', 'scraper_service']), getExecutionByDate);
router.get('/executions', requireRole(['admin']), getExecutions);
router.post('/executions', requireRole(['admin', 'scraper_service']), createExecution);

// Rotas com parâmetros por último
router.get('/executions/:id', requireRole(['admin']), getExecutionById);
router.patch('/executions/:id', requireRole(['admin', 'scraper_service']), updateExecution);
router.post('/executions/:id/complete', requireRole(['admin', 'scraper_service']), completeExecution);
router.post('/executions/:id/fail', requireRole(['admin', 'scraper_service']), failExecution);

export default router;