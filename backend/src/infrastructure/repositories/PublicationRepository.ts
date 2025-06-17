import { 
  IPublicationRepository, 
  PublicationFilters, 
  PaginationOptions, 
  PaginatedResult,
  CreatePublicationDto 
} from '../../domain/interfaces/IPublicationRepository';
import { Publication } from '../../domain/entities/Publication';
import { PublicationStatus } from '@prisma/client';
import prisma from '../database';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

export class PublicationRepository implements IPublicationRepository {
  
// PublicationRepository.ts - Implementação SENIOR com Window Function
// PublicationRepository.ts - Nomes de colunas corretos para PostgreSQL
async findAll(
  filters: PublicationFilters,
  pagination: PaginationOptions
): Promise<PaginatedResult<Publication>> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  // Construir WHERE clause dinamicamente
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.status) {
    // CORREÇÃO: Cast explícito para o enum do PostgreSQL
    // O nome do enum no PostgreSQL segue o padrão: "ModelName_fieldName"
    conditions.push(`status::text = $${params.length + 1}`);
    params.push(filters.status);
  }

  console.log("filters.query", filters.query)

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

    const result = await prisma.$queryRawUnsafe(
      query,
      ...params,
      limit,
      offset
    ) as any[];

    // Extrair total da primeira linha (window function)
    const total = result.length > 0 ? Number(result[0].total_count) : 0;

    // Remover total_count dos objetos e converter para entidades
    const cleanedResults = result.map(row => {
      const { total_count, ...publication } = row;
      return Publication.fromPrisma(publication);
    });

    console.log(`✅ Query executada com sucesso. Total: ${total}, Retornados: ${cleanedResults.length}`);

    return {
      data: cleanedResults,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };

  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
}

  // ALTERNATIVA: Método específico para buscar por status usando Prisma ORM
  async findByStatus(
    status: PublicationStatus,
    pagination: PaginationOptions,
    additionalFilters?: Omit<PublicationFilters, 'status'>
  ): Promise<PaginatedResult<Publication>> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    try {
      console.log(`🔍 Buscando publicações com status: ${status}`);

      // Construir WHERE clause para filtros adicionais
      const whereConditions: any = { status };

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
        prisma.publication.findMany({
          where: whereConditions,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.publication.count({
          where: whereConditions,
        }),
      ]);

      console.log(`✅ Encontradas ${publications.length} publicações de ${total} total`);

      return {
        data: publications.map(pub => Publication.fromPrisma(pub)),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };

    } catch (error) {
      console.error(`❌ Erro ao buscar por status ${status}:`, error);
      throw error;
    }
  }

  async findById(id: number): Promise<Publication | null> {
    const publication = await prisma.publication.findUnique({
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

    return publication ? Publication.fromPrisma(publication) : null;
  }

  async findByProcessNumber(processNumber: string): Promise<Publication | null> {
    const publication = await prisma.publication.findUnique({
      where: { processNumber },
    });

    return publication ? Publication.fromPrisma(publication) : null;
  }

  async create(data: CreatePublicationDto): Promise<Publication> {
    // Gerar hash se não fornecido
    const contentHash = data.contentHash || 
      (data.fullContent ? crypto.createHash('md5').update(data.fullContent).digest('hex') : null);

    const createdPublication = await prisma.publication.create({
      data: {
        ...data,
        contentHash,
      },
    });

    return Publication.fromPrisma(createdPublication);
  }

  async updateStatus(id: number, status: PublicationStatus): Promise<Publication> {
    const updatedPublication = await prisma.publication.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
    });

    return Publication.fromPrisma(updatedPublication);
  }

  async getStatusStats(): Promise<Record<PublicationStatus, number>> {
    const stats = await prisma.publication.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const formattedStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    // Garantir que todos os status estejam presentes
    const allStatuses: PublicationStatus[] = ['nova', 'lida', 'enviada_adv', 'concluida'];
    allStatuses.forEach(status => {
      if (!formattedStats[status]) {
        formattedStats[status] = 0;
      }
    });

    return formattedStats as Record<PublicationStatus, number>;
  }

  async existsByProcessNumber(processNumber: string): Promise<boolean> {
    const count = await prisma.publication.count({
      where: { processNumber },
    });

    return count > 0;
  }
}