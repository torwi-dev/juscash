"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publicationController_1 = require("../../controllers/publicationController");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Todas as rotas precisam de autenticação
router.use(auth_1.authenticateToken);
// Rotas de leitura (todos os usuários autenticados)
router.get('/', publicationController_1.getPublications);
router.get('/stats', publicationController_1.getPublicationStats);
router.get('/search', publicationController_1.searchPublications);
router.get('/kanban', publicationController_1.getPublicationsKanban);
router.get('/status/:status', publicationController_1.getPublicationsByStatus);
router.get('/:id', publicationController_1.getPublicationById);
// Rotas de escrita
router.post('/', (0, auth_1.requireRole)(['admin', 'scraper_service']), publicationController_1.createPublication);
router.patch('/:id/status', (0, auth_1.requireRole)(['admin', 'operador']), publicationController_1.updatePublicationStatus);
exports.default = router;
