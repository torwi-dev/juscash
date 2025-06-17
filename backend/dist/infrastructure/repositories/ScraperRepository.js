"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperRepository = void 0;
const ScraperExecution_1 = require("../../domain/entities/ScraperExecution");
const database_1 = __importDefault(require("../database"));
class ScraperRepository {
    async findAll(pagination) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;
        const [executions, total] = await Promise.all([
            database_1.default.scraperExecution.findMany({
                include: {
                    _count: {
                        select: { publications: true },
                    },
                },
                orderBy: { executionDate: 'desc' },
                skip,
                take: limit,
            }),
            database_1.default.scraperExecution.count(),
        ]);
        const domainExecutions = executions.map(exec => ScraperExecution_1.ScraperExecution.fromPrisma(exec));
        return {
            data: domainExecutions,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }
    async findById(id) {
        const execution = await database_1.default.scraperExecution.findUnique({
            where: { id },
        });
        return execution ? ScraperExecution_1.ScraperExecution.fromPrisma(execution) : null;
    }
    async findByDate(date) {
        // Mudou de findUnique para findFirst já que executionDate não é mais unique
        const execution = await database_1.default.scraperExecution.findFirst({
            where: { executionDate: date },
            orderBy: { createdAt: 'desc' },
        });
        return execution ? ScraperExecution_1.ScraperExecution.fromPrisma(execution) : null;
    }
    async create(data) {
        const createdExecution = await database_1.default.scraperExecution.create({
            data: {
                ...data,
                startTime: new Date(),
                status: 'running',
            },
        });
        return ScraperExecution_1.ScraperExecution.fromPrisma(createdExecution);
    }
    async update(id, data) {
        const updatedExecution = await database_1.default.scraperExecution.update({
            where: { id },
            data: {
                ...data,
                endTime: data.endTime || new Date(),
            },
        });
        return ScraperExecution_1.ScraperExecution.fromPrisma(updatedExecution);
    }
    async getStats() {
        const stats = await database_1.default.scraperExecution.aggregate({
            _sum: {
                publicationsFound: true,
                publicationsNew: true,
                publicationsDuplicated: true,
            },
            _count: {
                id: true,
            },
        });
        const statusStats = await database_1.default.scraperExecution.groupBy({
            by: ['status'],
            _count: {
                status: true,
            },
        });
        const recentExecutions = await database_1.default.scraperExecution.findMany({
            where: {
                executionDate: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
            orderBy: { executionDate: 'desc' },
            take: 7,
            select: {
                executionDate: true,
                publicationsNew: true,
                status: true,
            },
        });
        return {
            totals: stats,
            statusDistribution: statusStats,
            recentExecutions,
        };
    }
    async existsByDate(date) {
        const count = await database_1.default.scraperExecution.count({
            where: { executionDate: date },
        });
        return count > 0;
    }
}
exports.ScraperRepository = ScraperRepository;
