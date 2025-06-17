"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExecutionByDate = exports.getTodayExecution = exports.failExecution = exports.completeExecution = exports.getExecutionStats = exports.getExecutionById = exports.getExecutions = exports.updateExecution = exports.createExecution = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const container_1 = require("../infrastructure/container");
// Schemas de validação HTTP
const createExecutionSchema = zod_1.z.object({
    executionDate: zod_1.z.string(),
    djeUrl: zod_1.z.string().optional(),
    hostName: zod_1.z.string().optional(),
    executedBy: zod_1.z.string().optional(),
    environment: zod_1.z.string().optional(),
});
const updateExecutionSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.ScrapingStatus),
    endTime: zod_1.z.string().optional(),
    publicationsFound: zod_1.z.number().optional(),
    publicationsNew: zod_1.z.number().optional(),
    publicationsDuplicated: zod_1.z.number().optional(),
    errorMessage: zod_1.z.string().optional(),
});
const completeExecutionSchema = zod_1.z.object({
    publicationsFound: zod_1.z.number().min(0),
    publicationsNew: zod_1.z.number().min(0),
});
const failExecutionSchema = zod_1.z.object({
    errorMessage: zod_1.z.string().min(1, 'Mensagem de erro é obrigatória'),
});
// Controllers
const createExecution = async (req, res) => {
    try {
        const validatedData = createExecutionSchema.parse(req.body);
        const scraperService = (0, container_1.getScraperService)();
        const execution = await scraperService.createExecution({
            ...validatedData,
            executionDate: new Date(validatedData.executionDate),
        });
        res.status(201).json({
            message: 'Execução criada com sucesso',
            execution,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
            return;
        }
        if (error instanceof Error) {
            if (error.message.includes('já existe') || error.message.includes('futura')) {
                res.status(409).json({ error: error.message });
                return;
            }
            if (error.message.includes('obrigatório')) {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        console.error('Create execution error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.createExecution = createExecution;
const updateExecution = async (req, res) => {
    try {
        const { id } = req.params;
        const executionId = parseInt(id);
        const validatedData = updateExecutionSchema.parse(req.body);
        if (isNaN(executionId)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        // ✅ Construir UpdateExecutionDto corretamente
        const updateData = {
            status: validatedData.status,
            endTime: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
            publicationsFound: validatedData.publicationsFound,
            publicationsNew: validatedData.publicationsNew,
            publicationsDuplicated: validatedData.publicationsDuplicated,
            errorMessage: validatedData.errorMessage,
        };
        const scraperService = (0, container_1.getScraperService)();
        const updatedExecution = await scraperService.updateExecution(executionId, updateData);
        res.json({
            message: 'Execução atualizada com sucesso',
            execution: updatedExecution,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
            return;
        }
        if (error instanceof Error) {
            if (error.message === 'Execução não encontrada') {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error.message.includes('finalizada') || error.message.includes('obrigatórias') || error.message.includes('maior')) {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        console.error('Update execution error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.updateExecution = updateExecution;
const getExecutions = async (req, res) => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
        };
        const scraperService = (0, container_1.getScraperService)();
        const result = await scraperService.getExecutions(pagination);
        res.json({
            executions: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages,
            },
        });
    }
    catch (error) {
        console.error('Get executions error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getExecutions = getExecutions;
const getExecutionById = async (req, res) => {
    try {
        const { id } = req.params;
        const executionId = parseInt(id);
        if (isNaN(executionId)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const scraperService = (0, container_1.getScraperService)();
        const execution = await scraperService.getExecutionById(executionId);
        res.json(execution);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Execução não encontrada') {
            res.status(404).json({ error: error.message });
            return;
        }
        console.error('Get execution by ID error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getExecutionById = getExecutionById;
const getExecutionStats = async (req, res) => {
    try {
        const scraperService = (0, container_1.getScraperService)();
        const stats = await scraperService.getExecutionStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Get execution stats error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getExecutionStats = getExecutionStats;
const completeExecution = async (req, res) => {
    try {
        const { id } = req.params;
        const executionId = parseInt(id);
        const validatedData = completeExecutionSchema.parse(req.body);
        if (isNaN(executionId)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const scraperService = (0, container_1.getScraperService)();
        const completedExecution = await scraperService.completeExecution(executionId, validatedData.publicationsFound, validatedData.publicationsNew);
        res.json({
            message: 'Execução finalizada com sucesso',
            execution: completedExecution,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
            return;
        }
        if (error instanceof Error) {
            if (error.message === 'Execução não encontrada') {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        console.error('Complete execution error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.completeExecution = completeExecution;
const failExecution = async (req, res) => {
    try {
        const { id } = req.params;
        const executionId = parseInt(id);
        const validatedData = failExecutionSchema.parse(req.body);
        if (isNaN(executionId)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const scraperService = (0, container_1.getScraperService)();
        const failedExecution = await scraperService.failExecution(executionId, validatedData.errorMessage);
        res.json({
            message: 'Execução marcada como falha',
            execution: failedExecution,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
            return;
        }
        if (error instanceof Error) {
            if (error.message === 'Execução não encontrada') {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        console.error('Fail execution error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.failExecution = failExecution;
const getTodayExecution = async (req, res) => {
    try {
        const scraperService = (0, container_1.getScraperService)();
        const execution = await scraperService.getTodayExecution();
        if (!execution) {
            res.status(404).json({ error: 'Nenhuma execução encontrada para hoje' });
            return;
        }
        res.json(execution);
    }
    catch (error) {
        console.error('Get today execution error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getTodayExecution = getTodayExecution;
const getExecutionByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
            res.status(400).json({ error: 'Parâmetro date é obrigatório' });
            return;
        }
        // Validar formato da data
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
            return;
        }
        // Normalizar para início do dia (00:00:00)
        targetDate.setHours(0, 0, 0, 0);
        const scraperService = (0, container_1.getScraperService)();
        const execution = await scraperService.getExecutionByDate(targetDate);
        if (!execution) {
            res.status(404).json({ error: 'Execução não encontrada para esta data' });
            return;
        }
        res.json(execution);
    }
    catch (error) {
        console.error('Get execution by date error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getExecutionByDate = getExecutionByDate;
