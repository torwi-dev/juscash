import { 
  IScraperRepository, 
  CreateExecutionDto, 
  UpdateExecutionDto,
  PaginationOptions,
  PaginatedResult 
} from '../../domain/interfaces/IScraperRepository';
import { ScraperExecution } from '../../domain/entities/ScraperExecution';
import prisma from '../database';

export class ScraperRepository implements IScraperRepository {
  
  async findAll(pagination: PaginationOptions): Promise<PaginatedResult<ScraperExecution>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      prisma.scraperExecution.findMany({
        include: {
          _count: {
            select: { publications: true },
          },
        },
        orderBy: { executionDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.scraperExecution.count(),
    ]);

    const domainExecutions = executions.map(exec => ScraperExecution.fromPrisma(exec));

    return {
      data: domainExecutions,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: number): Promise<ScraperExecution | null> {
    const execution = await prisma.scraperExecution.findUnique({
      where: { id },
    });

    return execution ? ScraperExecution.fromPrisma(execution) : null;
  }

  async findByDate(date: Date): Promise<ScraperExecution | null> {
    // Mudou de findUnique para findFirst já que executionDate não é mais unique
    const execution = await prisma.scraperExecution.findFirst({
      where: { executionDate: date },
      orderBy: { createdAt: 'desc' },
    });

    return execution ? ScraperExecution.fromPrisma(execution) : null;
  }

  async create(data: CreateExecutionDto): Promise<ScraperExecution> {
    const createdExecution = await prisma.scraperExecution.create({
      data: {
        ...data,
        startTime: new Date(),
        status: 'running',
      },
    });

    return ScraperExecution.fromPrisma(createdExecution);
  }

  async update(id: number, data: UpdateExecutionDto): Promise<ScraperExecution> {
    const updatedExecution = await prisma.scraperExecution.update({
      where: { id },
      data: {
        ...data,
        endTime: data.endTime || new Date(),
      },
    });

    return ScraperExecution.fromPrisma(updatedExecution);
  }

  async getStats(): Promise<any> {
    const stats = await prisma.scraperExecution.aggregate({
      _sum: {
        publicationsFound: true,
        publicationsNew: true,
        publicationsDuplicated: true,
      },
      _count: {
        id: true,
      },
    });

    const statusStats = await prisma.scraperExecution.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const recentExecutions = await prisma.scraperExecution.findMany({
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

  async existsByDate(date: Date): Promise<boolean> {
    const count = await prisma.scraperExecution.count({
      where: { executionDate: date },
    });

    return count > 0;
  }
}