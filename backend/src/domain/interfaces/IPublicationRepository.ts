 
import { Publication } from '../entities/Publication';
import { PublicationStatus } from '@prisma/client';

export interface PublicationFilters {
  query?: string;
  status?: PublicationStatus;
  dateFrom?: Date;
  dateTo?: Date;
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

export interface CreatePublicationDto {
  processNumber: string;
  publicationDate?: Date;
  availabilityDate?: Date;
  authors: string[];
  lawyers: string[];
  mainValue?: number;
  interestValue?: number;
  legalFees?: number;
  fullContent?: string;
  sourceUrl?: string;
  scraperExecutionId?: number;
  contentHash?: string;
}

export interface IPublicationRepository {
  findAll(
    filters: PublicationFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Publication>>;

  findById(id: number): Promise<Publication | null>;

  findByProcessNumber(processNumber: string): Promise<Publication | null>;

  create(data: CreatePublicationDto): Promise<Publication>;

  updateStatus(id: number, status: PublicationStatus): Promise<Publication>;

  getStatusStats(): Promise<Record<PublicationStatus, number>>;

  existsByProcessNumber(processNumber: string): Promise<boolean>;
}