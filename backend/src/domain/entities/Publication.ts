 
import { PublicationStatus } from '@prisma/client';

export class Publication {
  constructor(
    public id: number,
    public processNumber: string,
    public publicationDate?: Date,
    public availabilityDate?: Date,
    public authors: string[] = [],
    public lawyers: string[] = [],
    public defendant: string = 'Instituto Nacional do Seguro Social - INSS',
    public mainValue?: number,
    public interestValue?: number,
    public legalFees?: number,
    public fullContent?: string,
    public status: PublicationStatus = 'nova',
    public contentHash?: string,
    public sourceUrl?: string,
    public scraperExecutionId?: number,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  // Business logic methods
  canMoveTo(newStatus: PublicationStatus): boolean {
    const allowedTransitions: Record<PublicationStatus, PublicationStatus[]> = {
      nova: ['lida'],
      lida: ['enviada_adv'],
      enviada_adv: ['lida', 'concluida'],
      concluida: [],
    };

    return allowedTransitions[this.status].includes(newStatus);
  }

  moveTo(newStatus: PublicationStatus): void {
    if (!this.canMoveTo(newStatus)) {
      throw new Error(`Transição de '${this.status}' para '${newStatus}' não permitida`);
    }
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  static fromPrisma(prismaPublication: any): Publication {
    return new Publication(
      prismaPublication.id,
      prismaPublication.processNumber,
      prismaPublication.publicationDate,
      prismaPublication.availabilityDate,
      prismaPublication.authors,
      prismaPublication.lawyers,
      prismaPublication.defendant,
      prismaPublication.mainValue ? Number(prismaPublication.mainValue) : undefined,
      prismaPublication.interestValue ? Number(prismaPublication.interestValue) : undefined,
      prismaPublication.legalFees ? Number(prismaPublication.legalFees) : undefined,
      prismaPublication.fullContent,
      prismaPublication.status,
      prismaPublication.contentHash,
      prismaPublication.sourceUrl,
      prismaPublication.scraperExecutionId,
      prismaPublication.createdAt,
      prismaPublication.updatedAt,
    );
  }
}


// Tipo para API (frontend)
export interface PublicationDto {
  id: number;
  processNumber: string;
  publicationDate: string;
  availabilityDate: string;
  authors: string[];
  lawyers: string[];
  defendant: string;
  mainValue: number | null;
  interestValue: number | null;
  legalFees: number | null;
  fullContent: string | null;
  status: PublicationStatus;
  contentHash: string | null;
  sourceUrl: string | null;
  scraperExecutionId: number | null;
  createdAt: string;
  updatedAt: string;
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

export interface KanbanResponse {
  nova: PublicationDto[];
  lida: PublicationDto[];
  enviada_adv: PublicationDto[];
  concluida: PublicationDto[];
}