import { ScraperExecution } from '../entities/ScraperExecution';
import { ScrapingStatus } from '@prisma/client';

export interface CreateExecutionDto {
  executionDate: Date;
  djeUrl?: string;
  hostName?: string;
  executedBy?: string;
  environment?: string;
}

export interface UpdateExecutionDto {
  status: ScrapingStatus;
  endTime?: Date;
  publicationsFound?: number;
  publicationsNew?: number;
  publicationsDuplicated?: number;
  errorMessage?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface IScraperRepository {
  findAll(pagination: PaginationOptions): Promise<PaginatedResult<ScraperExecution>>;
  findById(id: number): Promise<ScraperExecution | null>;
  findByDate(date: Date): Promise<ScraperExecution | null>;
  create(data: CreateExecutionDto): Promise<ScraperExecution>;
  update(id: number, data: UpdateExecutionDto): Promise<ScraperExecution>;
  getStats(): Promise<any>;
  existsByDate(date: Date): Promise<boolean>;
}