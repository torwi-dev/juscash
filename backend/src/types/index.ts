import { Request } from 'express';
import { Publication, UserRole } from '@prisma/client';
import { PublicationDto } from '../domain/entities/Publication';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdatePublicationStatusRequest {
  status: 'nova' | 'lida' | 'enviada_adv' | 'concluida';
}

export interface CreatePublicationRequest {
  processNumber: string;
  publicationDate?: string;
  availabilityDate?: string;
  authors: string[];
  lawyers: string[];
  mainValue?: number;
  interestValue?: number;
  legalFees?: number;
  fullContent?: string;
  sourceUrl?: string;
  scraperExecutionId?: number;
}

export interface PublicationResponse {
  publications: PublicationDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}