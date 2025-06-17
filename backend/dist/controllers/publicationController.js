"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicationsKanban = exports.searchPublications = exports.getPublicationsByStatus = exports.getPublicationStats = exports.updatePublicationStatus = exports.createPublication = exports.getPublicationById = exports.getPublications = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const container_1 = require("../infrastructure/container");
// Schemas de validação (mantemos o Zod para validação HTTP)
const createPublicationSchema = zod_1.z.object({
    processNumber: zod_1.z.string().min(1, 'Número do processo é obrigatório'),
    publicationDate: zod_1.z.string().optional(),
    availabilityDate: zod_1.z.string().optional(),
    authors: zod_1.z.array(zod_1.z.string()),
    lawyers: zod_1.z.array(zod_1.z.string()),
    mainValue: zod_1.z.number().optional(),
    interestValue: zod_1.z.number().optional(),
    legalFees: zod_1.z.number().optional(),
    fullContent: zod_1.z.string().optional(),
    sourceUrl: zod_1.z.string().optional(),
    scraperExecutionId: zod_1.z.number().optional(),
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.PublicationStatus),
});
const searchSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.PublicationStatus).optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    page: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
});
// Controller - Apenas HTTP handling
const getPublications = async (req, res) => {
    try {
        const validatedQuery = searchSchema.parse(req.query);
        const { query, status, dateFrom, dateTo, page = '1', limit = '30' } = validatedQuery;
        // Preparar filtros
        const filters = {
            query,
            status,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
        };
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
        };
        // Delegar para o service
        const publicationService = (0, container_1.getPublicationService)();
        const result = await publicationService.getPublications(filters, pagination);
        res.json({
            publications: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: 'Parâmetros inválidos',
                details: error.errors
            });
            return;
        }
        console.error('Get publications error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getPublications = getPublications;
const getPublicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const publicationId = parseInt(id);
        if (isNaN(publicationId)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const publicationService = (0, container_1.getPublicationService)();
        const publication = await publicationService.getPublicationById(publicationId);
        res.json(publication);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Publicação não encontrada') {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        console.error('Get publication by ID error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getPublicationById = getPublicationById;
const createPublication = async (req, res) => {
    try {
        const validatedData = createPublicationSchema.parse(req.body);
        // Converter dados HTTP para DTO do domínio
        const createDto = {
            processNumber: validatedData.processNumber,
            authors: validatedData.authors,
            lawyers: validatedData.lawyers,
            publicationDate: validatedData.publicationDate ? new Date(validatedData.publicationDate) : undefined,
            availabilityDate: validatedData.availabilityDate ? new Date(validatedData.availabilityDate) : undefined,
            mainValue: validatedData.mainValue,
            interestValue: validatedData.interestValue,
            legalFees: validatedData.legalFees,
            fullContent: validatedData.fullContent,
            sourceUrl: validatedData.sourceUrl,
            scraperExecutionId: validatedData.scraperExecutionId,
        };
        const publicationService = (0, container_1.getPublicationService)();
        const publication = await publicationService.createPublication(createDto);
        res.status(201).json({
            message: 'Publicação criada com sucesso',
            publication,
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
            if (error.message.includes('já existe')) {
                res.status(409).json({ error: error.message });
                return;
            }
            if (error.message.includes('obrigatório') || error.message.includes('deve ser')) {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        console.error('Create publication error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.createPublication = createPublication;
const updatePublicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const publicationId = parseInt(id);
        const validatedData = updateStatusSchema.parse(req.body);
        if (isNaN(publicationId)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const publicationService = (0, container_1.getPublicationService)();
        const updatedPublication = await publicationService.updatePublicationStatus(publicationId, validatedData.status);
        res.json({
            message: 'Status atualizado com sucesso',
            publication: updatedPublication,
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
            if (error.message === 'Publicação não encontrada') {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error.message.includes('Transição')) {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        console.error('Update publication status error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.updatePublicationStatus = updatePublicationStatus;
const getPublicationStats = async (req, res) => {
    try {
        const publicationService = (0, container_1.getPublicationService)();
        const stats = await publicationService.getPublicationStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Get publication stats error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getPublicationStats = getPublicationStats;
const getPublicationsByStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const validatedQuery = searchSchema.parse(req.query);
        const { query, dateFrom, dateTo, page = '1', limit = '30' } = validatedQuery;
        if (!Object.values(client_1.PublicationStatus).includes(status)) {
            res.status(400).json({ error: 'Status inválido' });
            return;
        }
        // Preparar filtros (igual ao kanban)
        const filters = {
            status: status,
            query: query,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
        };
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
        };
        const publicationService = (0, container_1.getPublicationService)();
        const filtersWithPagination = {
            ...filters,
            page: pagination.page,
            limit: pagination.limit
        };
        const result = await publicationService.getPublicationsByStatus(status, filtersWithPagination);
        res.json(result);
    }
    catch (error) {
        console.error('Get publications by status error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getPublicationsByStatus = getPublicationsByStatus;
const searchPublications = async (req, res) => {
    try {
        const { q: query } = req.query;
        const { page = '1', limit = '30' } = req.query;
        if (!query || typeof query !== 'string') {
            res.status(400).json({ error: 'Parâmetro de busca é obrigatório' });
            return;
        }
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
        };
        const publicationService = (0, container_1.getPublicationService)();
        const result = await publicationService.searchPublications(query, {}, pagination);
        res.json({
            publications: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages,
            },
        });
    }
    catch (error) {
        console.error('Search publications error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.searchPublications = searchPublications;
const getPublicationsKanban = async (req, res) => {
    try {
        const { query, dateFrom, dateTo, limit = '30' } = req.query;
        const filters = {
            query: query,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
        };
        const publicationService = (0, container_1.getPublicationService)();
        const kanbanData = await publicationService.getPublicationsForKanban(filters);
        res.json(kanbanData);
    }
    catch (error) {
        console.error('Get kanban publications error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.getPublicationsKanban = getPublicationsKanban;
