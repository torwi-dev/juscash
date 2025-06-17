import { Request, Response } from 'express';
import { z } from 'zod';
import { PublicationStatus } from '@prisma/client';
import { getPublicationService } from '../infrastructure/container';
import { CreatePublicationDto } from '../domain/interfaces/IPublicationRepository';

// Schemas de validação (mantemos o Zod para validação HTTP)
const createPublicationSchema = z.object({
  processNumber: z.string().min(1, 'Número do processo é obrigatório'),
  publicationDate: z.string().optional(),
  availabilityDate: z.string().optional(),
  authors: z.array(z.string()),
  lawyers: z.array(z.string()),
  mainValue: z.number().optional(),
  interestValue: z.number().optional(),
  legalFees: z.number().optional(),
  fullContent: z.string().optional(),
  sourceUrl: z.string().optional(),
  scraperExecutionId: z.number().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(PublicationStatus),
});

const searchSchema = z.object({
  query: z.string().optional(),
  status: z.nativeEnum(PublicationStatus).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// Controller - Apenas HTTP handling
export const getPublications = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedQuery = searchSchema.parse(req.query);
    const { 
      query, 
      status, 
      dateFrom, 
      dateTo, 
      page = '1', 
      limit = '30' 
    } = validatedQuery;

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
    const publicationService = getPublicationService();
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
  } catch (error) {
    if (error instanceof z.ZodError) {
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

export const getPublicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const publicationId = parseInt(id);

    if (isNaN(publicationId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const publicationService = getPublicationService();
    const publication = await publicationService.getPublicationById(publicationId);

    res.json(publication);
  } catch (error) {
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

export const createPublication = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createPublicationSchema.parse(req.body);
    
    // Converter dados HTTP para DTO do domínio
    const createDto: CreatePublicationDto = {
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

    const publicationService = getPublicationService();
    const publication = await publicationService.createPublication(createDto);

    res.status(201).json({
      message: 'Publicação criada com sucesso',
      publication,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

export const updatePublicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const publicationId = parseInt(id);
    const validatedData = updateStatusSchema.parse(req.body);

    if (isNaN(publicationId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const publicationService = getPublicationService();
    const updatedPublication = await publicationService.updatePublicationStatus(
      publicationId, 
      validatedData.status
    );

    res.json({
      message: 'Status atualizado com sucesso',
      publication: updatedPublication,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
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

export const getPublicationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const publicationService = getPublicationService();
    const stats = await publicationService.getPublicationStats();

    res.json(stats);
  } catch (error) {
    console.error('Get publication stats error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getPublicationsByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.params.status as PublicationStatus;
    const validatedQuery = searchSchema.parse(req.query);
    const { 
      query,
      dateFrom,
      dateTo,
      page = '1', 
      limit = '30' 
    } = validatedQuery;

    if (!Object.values(PublicationStatus).includes(status as PublicationStatus)) {
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

    const publicationService = getPublicationService();
	const filtersWithPagination = {
	  ...filters,
	  page: pagination.page,
	  limit: pagination.limit
	};

	const result = await publicationService.getPublicationsByStatus(
	  status,
	  filtersWithPagination 
	);

    res.json(result);
	
  } catch (error) {
    console.error('Get publications by status error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const searchPublications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q: query } = req.query;
    const { page = '1', limit = '30' } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Parâmetro de busca é obrigatório' });
      return;
    }

    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };

    const publicationService = getPublicationService();
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
  } catch (error) {
    console.error('Search publications error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getPublicationsKanban = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, dateFrom, dateTo, limit = '30' } = req.query;
    	
    const filters = {
      query: query as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    };

    const publicationService = getPublicationService();
    const kanbanData = await publicationService.getPublicationsForKanban(filters);

    res.json(kanbanData);
  } catch (error) {
    console.error('Get kanban publications error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};