"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scraperController_1 = require("../../controllers/scraperController");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Todas as rotas precisam de autenticação
router.use(auth_1.authenticateToken);
// Rotas específicas primeiro
router.get('/stats', (0, auth_1.requireRole)(['admin']), scraperController_1.getExecutionStats);
router.get('/today', (0, auth_1.requireRole)(['admin', 'scraper_service']), scraperController_1.getTodayExecution);
router.get('/by-date', (0, auth_1.requireRole)(['admin', 'scraper_service']), scraperController_1.getExecutionByDate);
router.get('/executions', (0, auth_1.requireRole)(['admin']), scraperController_1.getExecutions);
router.post('/executions', (0, auth_1.requireRole)(['admin', 'scraper_service']), scraperController_1.createExecution);
// Rotas com parâmetros por último
router.get('/executions/:id', (0, auth_1.requireRole)(['admin']), scraperController_1.getExecutionById);
router.patch('/executions/:id', (0, auth_1.requireRole)(['admin', 'scraper_service']), scraperController_1.updateExecution);
router.post('/executions/:id/complete', (0, auth_1.requireRole)(['admin', 'scraper_service']), scraperController_1.completeExecution);
router.post('/executions/:id/fail', (0, auth_1.requireRole)(['admin', 'scraper_service']), scraperController_1.failExecution);
exports.default = router;
