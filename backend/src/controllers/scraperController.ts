import { Request, Response } from 'express';
import { z } from 'zod';
import { ScrapingStatus } from '@prisma/client';
import { getScraperService } from '../infrastructure/container';

// Schemas de validação HTTP
const createExecutionSchema = z.object({
  executionDate: z.string(),
  djeUrl: z.string().optional(),
  hostName: z.string().optional(),
  executedBy: z.string().optional(),
  environment: z.string().optional(),
});

const updateExecutionSchema = z.object({
  status: z.nativeEnum(ScrapingStatus),
  endTime: z.string().optional(),
  publicationsFound: z.number().optional(),
  publicationsNew: z.number().optional(),
  publicationsDuplicated: z.number().optional(),
  errorMessage: z.string().optional(),
});

const completeExecutionSchema = z.object({
  publicationsFound: z.number().min(0),
  publicationsNew: z.number().min(0),
});

const failExecutionSchema = z.object({
  errorMessage: z.string().min(1, 'Mensagem de erro é obrigatória'),
});

// Controllers
export const createExecution = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createExecutionSchema.parse(req.body);
    
    const scraperService = getScraperService();
    const execution = await scraperService.createExecution({
      ...validatedData,
      executionDate: new Date(validatedData.executionDate),
    });

    res.status(201).json({
      message: 'Execução criada com sucesso',
      execution,
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

export const updateExecution = async (req: Request, res: Response): Promise<void> => {
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

    const scraperService = getScraperService();
    const updatedExecution = await scraperService.updateExecution(executionId, updateData);

    res.json({
      message: 'Execução atualizada com sucesso',
      execution: updatedExecution,
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

export const getExecutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    
    const pagination = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };

    const scraperService = getScraperService();
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
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getExecutionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const executionId = parseInt(id);

    if (isNaN(executionId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const scraperService = getScraperService();
    const execution = await scraperService.getExecutionById(executionId);

    res.json(execution);
  } catch (error) {
    if (error instanceof Error && error.message === 'Execução não encontrada') {
      res.status(404).json({ error: error.message });
      return;
    }
    
    console.error('Get execution by ID error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getExecutionStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const scraperService = getScraperService();
    const stats = await scraperService.getExecutionStats();

    res.json(stats);
  } catch (error) {
    console.error('Get execution stats error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const completeExecution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const executionId = parseInt(id);
    const validatedData = completeExecutionSchema.parse(req.body);

    if (isNaN(executionId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const scraperService = getScraperService();
    const completedExecution = await scraperService.completeExecution(
      executionId,
      validatedData.publicationsFound,
      validatedData.publicationsNew
    );

    res.json({
      message: 'Execução finalizada com sucesso',
      execution: completedExecution,
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
      if (error.message === 'Execução não encontrada') {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    
    console.error('Complete execution error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const failExecution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const executionId = parseInt(id);
    const validatedData = failExecutionSchema.parse(req.body);

    if (isNaN(executionId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const scraperService = getScraperService();
    const failedExecution = await scraperService.failExecution(
      executionId,
      validatedData.errorMessage
    );

    res.json({
      message: 'Execução marcada como falha',
      execution: failedExecution,
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
      if (error.message === 'Execução não encontrada') {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    
    console.error('Fail execution error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getTodayExecution = async (req: Request, res: Response): Promise<void> => {
  try {
    const scraperService = getScraperService();
    const execution = await scraperService.getTodayExecution();

    if (!execution) {
      res.status(404).json({ error: 'Nenhuma execução encontrada para hoje' });
      return;
    }

    res.json(execution);
  } catch (error) {
    console.error('Get today execution error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getExecutionByDate = async (req: Request, res: Response): Promise<void> => {
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

    const scraperService = getScraperService();
    const execution = await scraperService.getExecutionByDate(targetDate);
    
    if (!execution) {
      res.status(404).json({ error: 'Execução não encontrada para esta data' });
      return;
    }
    
    res.json(execution);
  } catch (error) {
    console.error('Get execution by date error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};