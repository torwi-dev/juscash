import { Router } from 'express';
import {
  getPublications,
  getPublicationById,
  createPublication,
  updatePublicationStatus,
  getPublicationStats,
  getPublicationsByStatus,
  searchPublications,
  getPublicationsKanban,
} from '../../controllers/publicationController';
import { authenticateToken, requireRole } from '../../middleware/auth';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Rotas de leitura (todos os usuários autenticados)
router.get('/', getPublications);
router.get('/stats', getPublicationStats);
router.get('/search', searchPublications);
router.get('/kanban', getPublicationsKanban); 
router.get('/status/:status', getPublicationsByStatus);
router.get('/:id', getPublicationById);

// Rotas de escrita
router.post('/', requireRole(['admin', 'scraper_service']), createPublication);
router.patch('/:id/status', requireRole(['admin', 'operador']), updatePublicationStatus);

export default router;