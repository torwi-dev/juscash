import { apiClient } from './api';
import type { 
  Publication, 
  PublicationFilters, 
  PublicationResponse, 
  PublicationStats,
  PublicationStatus,
  UpdateStatusRequest 
} from '@/types';

export class PublicationsService {
  private readonly endpoints = {
    base: '/api/publications',
    stats: '/api/publications/stats',
    search: '/api/publications/search',
    kanban: '/api/publications/kanban', // <-- NOVO ENDPOINT
    byStatus: (status: PublicationStatus) => `/api/publications/status/${status}`,
    byId: (id: number) => `/api/publications/${id}`,
    updateStatus: (id: number) => `/api/publications/${id}/status`,
  };

  /**
   * Busca publicações com filtros e paginação
   */
  async getPublications(filters: PublicationFilters = {}): Promise<PublicationResponse> {
    try {
      const params = this.buildQueryParams(filters);
      const response = await apiClient.get<PublicationResponse>(
        this.endpoints.base, 
        params
      );
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar publicações:', error);
      throw error;
    }
  }

  /**
   * Busca publicações por status específico
   */
 async getPublicationsByStatus(
    status: PublicationStatus, 
    filters: PublicationFilters = {}
  ): Promise<PublicationResponse> {
    try {
      // Constrói parâmetros incluindo filtros
       const params = this.buildQueryParams(filters);
       
      const response = await apiClient.get<PublicationResponse>(
        this.endpoints.byStatus(status),
        params
      );
      
      return response;
    } catch (error) {
      console.error(`Erro ao buscar publicações com status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Busca uma publicação específica por ID
   */
  async getPublicationById(id: number): Promise<Publication> {
    try {
      const response = await apiClient.get<Publication>(
        this.endpoints.byId(id)
      );
      
      return response;
    } catch (error) {
      console.error(`Erro ao buscar publicação ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca estatísticas das publicações (contadores por status)
   */
  async getPublicationsStats(): Promise<PublicationStats> {
    try {
      const response = await apiClient.get<PublicationStats>(
        this.endpoints.stats
      );
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de uma publicação
   */
  async updatePublicationStatus(
    id: number, 
    status: PublicationStatus
  ): Promise<Publication> {
    try {
      const data: UpdateStatusRequest = { status };
      const response = await apiClient.patch<Publication>(
        this.endpoints.updateStatus(id),
        data
      );
      
      return response;
    } catch (error) {
      console.error(`Erro ao atualizar status da publicação ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca avançada com termo de pesquisa
   */
  async searchPublications(
    searchTerm: string, 
    filters: Omit<PublicationFilters, 'search'> = {}
  ): Promise<PublicationResponse> {
    try {
      const params = this.buildQueryParams({ ...filters, search: searchTerm });
      const response = await apiClient.get<PublicationResponse>(
        this.endpoints.search, 
        params
      );
      
      return response;
    } catch (error) {
      console.error('Erro na busca avançada:', error);
      throw error;
    }
  }

  /**
   * Busca publicações para o Kanban (organizadas por status)
   * NOVA IMPLEMENTAÇÃO - usa endpoint /kanban
   */
  async getPublicationsForKanban(filters: PublicationFilters = {}): Promise<{
    nova: Publication[];
    lida: Publication[];
    enviada_adv: Publication[];
    concluida: Publication[];
  }> {
    try {
      console.log('🔄 Chamando API /kanban com filtros:', filters);
      
      // Mapeia os filtros do frontend para os parâmetros da API
      const apiParams = this.buildKanbanQueryParams(filters);
      
      const response = await apiClient.get<{
        nova: Publication[];
        lida: Publication[];
        enviada_adv: Publication[];
        concluida: Publication[];
      }>(
        this.endpoints.kanban,
        apiParams
      );

      console.log('✅ Resposta da API /kanban:', response);
     return response;
      
    } catch (error) {
      console.error('❌ Erro ao buscar dados do Kanban:', error);
      throw error;
    }
  }

  /**
   * Valida se a transição de status é permitida
   */
  validateStatusTransition(currentStatus: PublicationStatus, newStatus: PublicationStatus): boolean {
    const allowedTransitions: Record<PublicationStatus, PublicationStatus[]> = {
      nova: ['lida'],
      lida: ['enviada_adv'],
      enviada_adv: ['concluida', 'lida'], // Pode voltar para lida
      concluida: [], // Não pode mover para lugar nenhum
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Obtém próximos status válidos para uma publicação
   */
  getValidNextStatuses(currentStatus: PublicationStatus): PublicationStatus[] {
    const allowedTransitions: Record<PublicationStatus, PublicationStatus[]> = {
      nova: ['lida'],
      lida: ['enviada_adv'],
      enviada_adv: ['concluida', 'lida'],
      concluida: [],
    };

    return allowedTransitions[currentStatus] || [];
  }

  /**
   * Constrói parâmetros de query para as requisições gerais
   */
  private buildQueryParams(filters: PublicationFilters): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.date_from) {
      params.date_from = filters.date_from;
    }

    if (filters.date_to) {
      params.date_to = filters.date_to;
    }

    if (filters.page) {
      params.page = filters.page;
    }

    if (filters.limit) {
      params.limit = filters.limit;
    }

    return params;
  }

  /**
   * Constrói parâmetros específicos para a API do Kanban
   * Mapeia nomes do frontend para nomes da API
   */
  private buildKanbanQueryParams(filters: PublicationFilters): Record<string, any> {
    const params: Record<string, any> = {};

    // Frontend usa 'search', API usa 'query'
    if (filters.search?.trim()) {
      params.query = filters.search.trim();
    }

    // Frontend usa 'date_from', API usa 'dateFrom'
    if (filters.date_from) {
      params.dateFrom = filters.date_from;
    }

    // Frontend usa 'date_to', API usa 'dateTo'
    if (filters.date_to) {
      params.dateTo = filters.date_to;
    }

    // Limite para o Kanban
    if (filters.limit) {
      params.limit = filters.limit;
    }

    return params;
  }

  /**
   * Exporta publicações para CSV (futuro)
   */
  async exportToCSV(filters: PublicationFilters = {}): Promise<Blob> {
    try {
      const params = this.buildQueryParams({ ...filters, limit: 10000 });
      const response = await apiClient.axios.get(
        `${this.endpoints.base}/export`,
        { 
          params,
          responseType: 'blob',
          headers: {
            'Accept': 'text/csv',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      throw error;
    }
  }

  /**
   * Obtém resumo estatístico das publicações
   */
  async getPublicationsSummary(filters: PublicationFilters = {}): Promise<{
    total: number;
    totalValue: number;
    averageValue: number;
    statusBreakdown: PublicationStats;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      const response = await apiClient.get(
        `${this.endpoints.base}/summary`,
        params
      );
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
      throw error;
    }
  }
}

// Exporta uma instância única
export const publicationsService = new PublicationsService();