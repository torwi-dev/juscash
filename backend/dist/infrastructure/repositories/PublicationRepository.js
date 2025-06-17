"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicationRepository = void 0;
const Publication_1 = require("../../domain/entities/Publication");
const database_1 = __importDefault(require("../database"));
const crypto = __importStar(require("crypto"));
class PublicationRepository {
    // PublicationRepository.ts - Implementação SENIOR com Window Function
    // PublicationRepository.ts - Nomes de colunas corretos para PostgreSQL
    async findAll(filters, pagination) {
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;
        // Construir WHERE clause dinamicamente
        const conditions = [];
        const params = [];
        if (filters.status) {
            // CORREÇÃO: Cast explícito para o enum do PostgreSQL
            // O nome do enum no PostgreSQL segue o padrão: "ModelName_fieldName"
            conditions.push(`status::text = $${params.length + 1}`);
            params.push(filters.status);
        }
        console.log("filters.query", filters.query);
        if (filters.query) {
            const searchTerm = `%${filters.query.trim()}%`;
            conditions.push(`(
      process_number ILIKE $${params.length + 1} OR
      full_content ILIKE $${params.length + 1} OR
      array_to_string(authors, ' ') ILIKE $${params.length + 1} OR
      array_to_string(lawyers, ' ') ILIKE $${params.length + 1}
    )`);
            params.push(searchTerm);
        }
        if (filters.dateFrom) {
            conditions.push(`publication_date >= $${params.length + 1}`);
            params.push(filters.dateFrom);
        }
        if (filters.dateTo) {
            conditions.push(`publication_date <= $${params.length + 1}`);
            params.push(filters.dateTo);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Query otimizada com Window Function - nomes corretos das colunas
        const query = `
  SELECT 
    id,
    process_number as "processNumber",
    publication_date as "publicationDate", 
    availability_date as "availabilityDate",
    authors,
    lawyers,
    defendant,
    main_value as "mainValue",
    interest_value as "interestValue", 
    legal_fees as "legalFees",
    full_content as "fullContent",
    status,
    content_hash as "contentHash",
    source_url as "sourceUrl",
    scraper_execution_id as "scraperExecutionId",
    created_at as "createdAt",
    updated_at as "updatedAt",
    COUNT(*) OVER() as total_count
  FROM publications
  ${whereClause}
  ORDER BY created_at DESC
  LIMIT $${params.length + 1} OFFSET $${params.length + 2}
`;
        try {
            console.log('🚀 Executando query:', query);
            console.log('📋 Parâmetros:', [...params, limit, offset]);
            const result = await database_1.default.$queryRawUnsafe(query, ...params, limit, offset);
            // Extrair total da primeira linha (window function)
            const total = result.length > 0 ? Number(result[0].total_count) : 0;
            // Remover total_count dos objetos e converter para entidades
            const cleanedResults = result.map(row => {
                const { total_count, ...publication } = row;
                return Publication_1.Publication.fromPrisma(publication);
            });
            console.log(`✅ Query executada com sucesso. Total: ${total}, Retornados: ${cleanedResults.length}`);
            return {
                data: cleanedResults,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            console.error('❌ Erro na query:', error);
            throw error;
        }
    }
    // ALTERNATIVA: Método específico para buscar por status usando Prisma ORM
    async findByStatus(status, pagination, additionalFilters) {
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;
        try {
            console.log(`🔍 Buscando publicações com status: ${status}`);
            // Construir WHERE clause para filtros adicionais
            const whereConditions = { status };
            if (additionalFilters?.query) {
                const searchTerm = additionalFilters.query.trim();
                whereConditions.OR = [
                    { processNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { fullContent: { contains: searchTerm, mode: 'insensitive' } },
                    { authors: { hasSome: [searchTerm] } },
                    { lawyers: { hasSome: [searchTerm] } },
                ];
            }
            if (additionalFilters?.dateFrom) {
                whereConditions.publicationDate = {
                    ...whereConditions.publicationDate,
                    gte: additionalFilters.dateFrom,
                };
            }
            if (additionalFilters?.dateTo) {
                whereConditions.publicationDate = {
                    ...whereConditions.publicationDate,
                    lte: additionalFilters.dateTo,
                };
            }
            // Usar Prisma ORM normal em vez de query raw
            const [publications, total] = await Promise.all([
                database_1.default.publication.findMany({
                    where: whereConditions,
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                database_1.default.publication.count({
                    where: whereConditions,
                }),
            ]);
            console.log(`✅ Encontradas ${publications.length} publicações de ${total} total`);
            return {
                data: publications.map(pub => Publication_1.Publication.fromPrisma(pub)),
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            console.error(`❌ Erro ao buscar por status ${status}:`, error);
            throw error;
        }
    }
    async findById(id) {
        const publication = await database_1.default.publication.findUnique({
            where: { id },
            include: {
                scraperExecution: {
                    select: {
                        id: true,
                        executionDate: true,
                        hostName: true,
                        executedBy: true,
                    },
                },
            },
        });
        return publication ? Publication_1.Publication.fromPrisma(publication) : null;
    }
    async findByProcessNumber(processNumber) {
        const publication = await database_1.default.publication.findUnique({
            where: { processNumber },
        });
        return publication ? Publication_1.Publication.fromPrisma(publication) : null;
    }
    async create(data) {
        // Gerar hash se não fornecido
        const contentHash = data.contentHash ||
            (data.fullContent ? crypto.createHash('md5').update(data.fullContent).digest('hex') : null);
        const createdPublication = await database_1.default.publication.create({
            data: {
                ...data,
                contentHash,
            },
        });
        return Publication_1.Publication.fromPrisma(createdPublication);
    }
    async updateStatus(id, status) {
        const updatedPublication = await database_1.default.publication.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date()
            },
        });
        return Publication_1.Publication.fromPrisma(updatedPublication);
    }
    async getStatusStats() {
        const stats = await database_1.default.publication.groupBy({
            by: ['status'],
            _count: {
                status: true,
            },
        });
        const formattedStats = stats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
        }, {});
        // Garantir que todos os status estejam presentes
        const allStatuses = ['nova', 'lida', 'enviada_adv', 'concluida'];
        allStatuses.forEach(status => {
            if (!formattedStats[status]) {
                formattedStats[status] = 0;
            }
        });
        return formattedStats;
    }
    async existsByProcessNumber(processNumber) {
        const count = await database_1.default.publication.count({
            where: { processNumber },
        });
        return count > 0;
    }
}
exports.PublicationRepository = PublicationRepository;
