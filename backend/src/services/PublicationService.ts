import { 
  IPublicationRepository,
  PublicationFilters,
  PaginationOptions,
  PaginatedResult,
  CreatePublicationDto 
} from '../domain/interfaces/IPublicationRepository';
import { Publication, PublicationDto } from '../domain/entities/Publication';
import { PublicationStatus } from '@prisma/client';
import { 

} from '../domain/errors';
import { AlreadyExistsError, BusinessRuleError, InvalidTransitionError, NotFoundError, ValidationError } from '../domain/errors/DomainErrors';
import { PublicationResponse } from '../types';

export class PublicationService {
  constructor(private publicationRepository: IPublicationRepository) {}

  async getPublications(
    filters: PublicationFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 30 }
  ) {
    // Validações
    if (pagination.page < 1) {
      throw new ValidationError('Página deve ser maior que 0');
    }
    
    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new ValidationError('Limite deve estar entre 1 e 100');
    }

    return await this.publicationRepository.findAll(filters, pagination);
  }

  async getPublicationById(id: number): Promise<Publication> {
    if (!id || id < 1) {
      throw new ValidationError('ID inválido');
    }

    const publication = await this.publicationRepository.findById(id);
    
    if (!publication) {
      throw new NotFoundError('Publicação não encontrada');
    }

    return publication;
  }

  async createPublication(data: CreatePublicationDto): Promise<Publication> {
    // Validações de negócio
    if (!data.processNumber?.trim()) {
      throw new ValidationError('Número do processo é obrigatório');
    }

    if (!data.authors || data.authors.length === 0) {
      throw new ValidationError('Pelo menos um autor deve ser informado');
    }

    if (data.authors.some(author => !author.trim())) {
      throw new ValidationError('Nomes dos autores não podem estar vazios');
    }

    if (data.lawyers && data.lawyers.some(lawyer => !lawyer.trim())) {
      throw new ValidationError('Nomes dos advogados não podem estar vazios');
    }

    // Validações de valores monetários
    if (data.mainValue !== undefined && data.mainValue < 0) {
      throw new ValidationError('Valor principal não pode ser negativo');
    }

    if (data.interestValue !== undefined && data.interestValue < 0) {
      throw new ValidationError('Valor dos juros não pode ser negativo');
    }

    if (data.legalFees !== undefined && data.legalFees < 0) {
      throw new ValidationError('Honorários não podem ser negativos');
    }

    // Verificar duplicata
    const existingPublication = await this.publicationRepository.existsByProcessNumber(data.processNumber);
    
    if (existingPublication) {
      throw new AlreadyExistsError(`Publicação já existe com o número de processo: ${data.processNumber}`);
    }

    // Validar datas
    if (data.publicationDate && data.availabilityDate) {
      if (data.publicationDate > data.availabilityDate) {
        throw new BusinessRuleError('Data de publicação não pode ser posterior à data de disponibilização');
      }
    }

    return await this.publicationRepository.create(data);
  }

  async updatePublicationStatus(id: number, newStatus: PublicationStatus): Promise<Publication> {
    if (!id || id < 1) {
      throw new ValidationError('ID inválido');
    }

    // Buscar publicação atual
    const currentPublication = await this.publicationRepository.findById(id);
    
    if (!currentPublication) {
      throw new NotFoundError('Publicação não encontrada');
    }

    // Validar transição usando a lógica do domínio
    if (!currentPublication.canMoveTo(newStatus)) {
      throw new InvalidTransitionError(
        `Transição de '${currentPublication.status}' para '${newStatus}' não é permitida`
      );
    }

    // Aplicar regras de negócio específicas
    if (newStatus === 'concluida') {
      // Verificar se tem informações mínimas para concluir
      if (!currentPublication.fullContent) {
        throw new BusinessRuleError('Publicação deve ter conteúdo completo para ser concluída');
      }
    }

    // Atualizar status
    return await this.publicationRepository.updateStatus(id, newStatus);
  }

  async getPublicationStats() {
    return await this.publicationRepository.getStatusStats();
  }

	async getPublicationsByStatus(
		status: PublicationStatus, 
		filters: any
	  ): Promise<PublicationResponse> {
		const { page, limit, ...otherFilters } = filters;
		
		const result = await this.publicationRepository.findAll(
		  { ...otherFilters, status },
		  { page: page || 1, limit: limit || 30 }
		);
		
  const publicationsDto: PublicationDto[] = result.data.map(pub => ({
    id: pub.id,
    processNumber: pub.processNumber,
    publicationDate: pub.publicationDate.toISOString(),
    availabilityDate: pub.availabilityDate.toISOString(),
    authors: pub.authors,
    lawyers: pub.lawyers,
    defendant: pub.defendant,
    mainValue: pub.mainValue ? Number(pub.mainValue) : null,
    interestValue: pub.interestValue ? Number(pub.interestValue) : null,
    legalFees: pub.legalFees ? Number(pub.legalFees) : null,
    fullContent: pub.fullContent,
    status: pub.status,
    contentHash: pub.contentHash,
    sourceUrl: pub.sourceUrl,
    scraperExecutionId: pub.scraperExecutionId,
    createdAt: pub.createdAt.toISOString(),
    updatedAt: pub.updatedAt.toISOString()
  }));
  
  return {
    publications: publicationsDto, // ← Aqui usa o convertido
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: result.pages
    }
  };
	  }

	  async searchPublications(
		query: string,
		filters: Omit<PublicationFilters, 'query'> = {},
		pagination?: PaginationOptions
	  ) {
		if (!query?.trim()) {
		  throw new ValidationError('Termo de busca é obrigatório');
		}

		if (query.length < 2) {
		  throw new ValidationError('Termo de busca deve ter pelo menos 2 caracteres');
		}

		return await this.publicationRepository.findAll(
		  { ...filters, query: query.trim() },
		  pagination || { page: 1, limit: 30 }
		);
	  }
  
	async getPublicationsForKanban(filters?: any) {
		const statuses: PublicationStatus[] = ['nova', 'lida', 'enviada_adv', 'concluida'];
		
		const kanbanData: Record<PublicationStatus, Publication[]> = {
		  nova: [],
		  lida: [],
		  enviada_adv: [],
		  concluida: []
		};
		
		const kanbanMeta: Record<PublicationStatus, { total: number; hasMore: boolean; currentPage: number }> = {
		  nova: { total: 0, hasMore: false, currentPage: 1 },
		  lida: { total: 0, hasMore: false, currentPage: 1 },
		  enviada_adv: { total: 0, hasMore: false, currentPage: 1 },
		  concluida: { total: 0, hasMore: false, currentPage: 1 }
		};

		for (const status of statuses) {
		  const result = await this.publicationRepository.findAll(
			{ ...filters, status }, 
			{ page: 1, limit: 30 }
		  );
		  
		  kanbanData[status] = result.data;
		  kanbanMeta[status] = {
			total: result.total,
			hasMore: result.page < result.pages,
			currentPage: result.page
		  };
		}

		return { kanbanData, kanbanMeta };
	  }
}