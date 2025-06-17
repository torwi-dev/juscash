// src/hooks/usePublications.ts
import { useEffect, useCallback, useMemo } from 'react';
import { usePublicationsStore } from '@/stores';
import type { PublicationFilters, PublicationStatus, Publication } from '@/types';
import { useDebounce } from './useDebounce';

/**
 * Hook para gerenciar lista de publicações com filtros
 */
export const usePublicationsList = (initialFilters?: PublicationFilters) => {
  const publications = usePublicationsStore((state) => state.publications);
  const isLoading = usePublicationsStore((state) => state.isLoading);
  const error = usePublicationsStore((state) => state.error);
  const filters = usePublicationsStore((state) => state.filters);
  const fetchPublications = usePublicationsStore((state) => state.fetchPublications);
  const setFilters = usePublicationsStore((state) => state.setFilters);
  const clearError = usePublicationsStore((state) => state.clearError);

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
    fetchPublications(initialFilters);
  }, []);

  const updateFilters = useCallback((newFilters: PublicationFilters) => {
    setFilters(newFilters);
    fetchPublications({ ...filters, ...newFilters });
  }, [filters, setFilters, fetchPublications]);

  return {
    publications,
    isLoading,
    error,
    filters,
    updateFilters,
    refetch: () => fetchPublications(filters),
    clearError,
  };
};

/**
 * Hook para busca com debounce
 */
export const usePublicationsSearch = (delay: number = 500) => {
  const searchPublications = usePublicationsStore((state) => state.searchPublications);
  const setFilters = usePublicationsStore((state) => state.setFilters);
  const publications = usePublicationsStore((state) => state.publications);
  const isLoading = usePublicationsStore((state) => state.isLoading);
  const error = usePublicationsStore((state) => state.error);
  const filters = usePublicationsStore((state) => state.filters);

  const performSearch = useCallback(
    async (searchTerm: string, additionalFilters?: PublicationFilters) => {
      if (!searchTerm.trim()) {
        // Se termo vazio, busca todas as publicações
        return searchPublications('', additionalFilters);
      }
      
      return searchPublications(searchTerm, additionalFilters);
    },
    [searchPublications]
  );

  // Usa debounce para evitar muitas requisições
  const debouncedSearch = useDebounce(performSearch, delay);

  return {
    search: debouncedSearch,
    publications,
    isLoading,
    error,
    filters,
  };
};

/**
 * Hook para o sistema Kanban
 */
export const useKanbanBoard = () => {
  const kanbanData = usePublicationsStore((state) => state.kanbanData || {
                      nova: [],
                      lida: [],
                      enviada_adv: [],
                      concluida: []
                    });
  const isLoadingKanban = usePublicationsStore((state) => state.isLoadingKanban);
  const selectedPublication = usePublicationsStore((state) => state.selectedPublication);
  const loadKanbanData = usePublicationsStore((state) => state.loadKanbanData);
  const movePublication = usePublicationsStore((state) => state.movePublication);
  const movePublicationToPosition = usePublicationsStore((state) => state.movePublicationToPosition);
  const movePublicationOptimistic = usePublicationsStore((state) => state.movePublicationOptimistic);
  const revertOptimisticMove = usePublicationsStore((state) => state.revertOptimisticMove);
  const setSelectedPublication = usePublicationsStore((state) => state.setSelectedPublication);
  const loadMore = usePublicationsStore((state) => state.loadMore);
  
let isInitializing = false;
  // Carrega dados iniciais do Kanban
  useEffect(() => {
    if (!isInitializing) {
      isInitializing = true;
      console.log('🔄 Inicializando Kanban (primeira vez)...');
      
      Promise.all([
        loadKanbanData()
      ]).finally(() => {
        isInitializing = false;
      });
    }
  }, [loadKanbanData]);

  // Move com atualização otimista
  const handleMovePublicationOptimistic = useCallback(
    async (publicationId: number, fromStatus: PublicationStatus, toStatus: PublicationStatus, position?: number) => {
      // Primeiro move na UI (instantâneo)
      movePublicationOptimistic(publicationId, fromStatus, toStatus, position);
      
      try {
        // Depois chama a API
        if (position !== undefined) {
          await movePublicationToPosition(publicationId, fromStatus, toStatus, position);
        } else {
          await movePublication(publicationId, fromStatus, toStatus);
        }
        
      } catch (error) {
        // Se der erro, reverte a mudança otimista
        revertOptimisticMove(publicationId, fromStatus, toStatus);
        console.error('Erro ao mover publicação:', error);
        throw error;
      }
    },
    [movePublicationOptimistic, movePublication, movePublicationToPosition, revertOptimisticMove]
  );

  const handleLoadMore = useCallback(
    (status: PublicationStatus) => {
      return loadMore(status);
    },
    [loadMore]
  );

  // Estatísticas das colunas
const columnStats = useMemo(() => ({
  nova: kanbanData?.nova?.length || 0,
  lida: kanbanData?.lida?.length || 0,
  enviada_adv: kanbanData?.enviada_adv?.length || 0,
  concluida: kanbanData?.concluida?.length || 0,
}), [kanbanData]);

  return {
    kanbanData,
    isLoading: isLoadingKanban,
    selectedPublication,
    columnStats,
    movePublication: handleMovePublicationOptimistic, // Usa a versão otimista
    setSelectedPublication,
    loadMore: handleLoadMore,
    refresh: () => loadKanbanData(),
  };
};

/**
 * Hook para modal de detalhes da publicação
 */
export const usePublicationModal = () => {
  const selectedPublication = usePublicationsStore((state) => state.selectedPublication);
  const setSelectedPublication = usePublicationsStore((state) => state.setSelectedPublication);

  const openModal = useCallback((publication: Publication) => {
    setSelectedPublication(publication);
  }, [setSelectedPublication]);

  const closeModal = useCallback(() => {
    setSelectedPublication(null);
  }, [setSelectedPublication]);

  return {
    publication: selectedPublication,
    isOpen: !!selectedPublication,
    open: openModal,
    close: closeModal,
  };
};

/**
 * Hook para filtros avançados com estado local
 */
export const usePublicationFilters = () => {
  const filters = usePublicationsStore((state) => state.filters);
  const setFilters = usePublicationsStore((state) => state.setFilters);
  const fetchPublications = usePublicationsStore((state) => state.fetchPublications);
  const loadKanbanData = usePublicationsStore((state) => state.loadKanbanData);

  const updateFilter = useCallback((key: keyof PublicationFilters, value: any) => {
    console.log(`🔄 updateFilter chamado: ${key} = ${value}`);
    
    let newFilters = { ...usePublicationsStore.getState().filters };
    
    // Se value é undefined, vazio ou null, REMOVE o campo COMPLETAMENTE
    if (value === undefined || value === '' || value === null) {
      console.log(`❌ Removendo campo ${key} dos filtros`);
      delete newFilters[key];
    } else {
      console.log(`✅ Adicionando/atualizando campo ${key} nos filtros`);
      newFilters[key] = value;
    }
    
    // Sempre reseta a página
    newFilters.page = 1;
    
    console.log('📋 setFilters será chamado com:', newFilters);
    setFilters(newFilters);
  }, [setFilters]);

  const applyFilters = useCallback(async () => {
    // Pega os filtros ATUAIS do store, não do closure
    const currentFilters = usePublicationsStore.getState().filters;
    console.log('🚀 Aplicando filtros:', currentFilters);
    
    try {
      await loadKanbanData(currentFilters);
      
      console.log('✅ Filtros aplicados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao aplicar filtros:', error);
    }
  }, [fetchPublications, loadKanbanData]); // Remove 'filters' da dependência

  const clearFilters = useCallback(async () => {
    console.log('🧹 clearFilters chamado - limpando TODOS os filtros');
    
    // Pega os filtros atuais do store
    const currentFilters = usePublicationsStore.getState().filters;
    
    // Filtros completamente limpos - só mantém page e limit
    const clearedFilters: PublicationFilters = {
      page: 1,
      limit: currentFilters.limit || 30,
    };
    
    console.log('🔄 Definindo filtros limpos:', clearedFilters);
    setFilters(clearedFilters);
    
    try {
      // Aplica os filtros limpos imediatamente
      await Promise.all([
        loadKanbanData(clearedFilters)
      ]);
      
      console.log('✅ Todos os filtros limpos com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar filtros:', error);
    }
  }, [setFilters, fetchPublications, loadKanbanData]);

  const hasActiveFilters = useMemo(() => {
    // Lista de campos que NÃO são considerados filtros ativos
    const excludeKeys = ['page', 'limit'];
    
    // Verifica se há filtros ativos
    const activeFilters = Object.entries(filters).filter(([key, value]) => {
      // Ignora page e limit
      if (excludeKeys.includes(key)) return false;
      
      // Considera ativo se tem valor e não é vazio
      const isActive = value !== undefined && value !== '' && value !== null;
      
      if (isActive) {
        console.log(`🔍 Filtro ativo encontrado: ${key} = ${value}`);
      }
      
      return isActive;
    });
    
    const hasFilters = activeFilters.length > 0;
    console.log(`🔍 hasActiveFilters: ${hasFilters}, total: ${activeFilters.length}`, activeFilters);
    
    return hasFilters;
  }, [filters]);

  // Função para remover filtro específico (NOVA)
  const removeFilter = useCallback(async (key: keyof PublicationFilters) => {
    console.log(`🗑️ removeFilter chamado para: ${key}`);
    
    // Pega os filtros atuais do store
    const currentFilters = usePublicationsStore.getState().filters;
    
    // Cria novos filtros sem o campo específico
    const { [key]: removed, ...newFilters } = currentFilters;
    
    // Mantém page e limit
    const finalFilters = {
      page: 1,
      limit: currentFilters.limit || 30,
      ...newFilters
    };
    
    console.log(`📋 Filtros após remoção de ${key}:`, finalFilters);
    setFilters(finalFilters);
    
    try {
      await Promise.all([
        fetchPublications(finalFilters),
        loadKanbanData(finalFilters)
      ]);
      
      console.log(`✅ Filtro ${key} removido e dados atualizados`);
    } catch (error) {
      console.error(`❌ Erro ao remover filtro ${key}:`, error);
    }
  }, [setFilters, fetchPublications, loadKanbanData]);

  return {
    filters,
    updateFilter,
    applyFilters,
    clearFilters,
    removeFilter, // Nova função
    hasActiveFilters,
  };
};

/**
 * Hook para validação de transições de status
 */
export const useStatusTransitions = () => {
  const getValidTransitions = useCallback((currentStatus: PublicationStatus): PublicationStatus[] => {
    const transitions: Record<PublicationStatus, PublicationStatus[]> = {
      nova: ['lida'],
      lida: ['enviada_adv', 'nova'], // pode voltar para nova se necessário
      enviada_adv: ['concluida', 'lida'], // pode voltar para lida ou ir para concluída
      concluida: [], // não pode sair de concluída
    };

    return transitions[currentStatus] || [];
  }, []);

  const canTransition = useCallback((from: PublicationStatus, to: PublicationStatus): boolean => {
    if (from === to) return true;
    
    const validTransitions = getValidTransitions(from);
    return validTransitions.includes(to);
  }, [getValidTransitions]);

  const getTransitionError = useCallback((from: PublicationStatus, to: PublicationStatus): string | null => {
    if (!canTransition(from, to)) {
      const statusNames = {
        nova: 'Nova',
        lida: 'Lida',
        enviada_adv: 'Enviada para Advogado',
        concluida: 'Concluída'
      };
      
      if (from === 'concluida') {
        return 'Publicações concluídas não podem ser movidas';
      }
      
      return `Não é possível mover de "${statusNames[from]}" para "${statusNames[to]}"`;
    }
    return null;
  }, [canTransition]);

  return {
    getValidTransitions,
    canTransition,
    getTransitionError,
  };
};

export class FiltersDebugger {
  
  /**
   * Log detalhado dos filtros aplicados
   */
  static logFilters(filters: PublicationFilters, context: string = '') {
    console.group(`🔍 Filtros Debug ${context ? `- ${context}` : ''}`);
    
    console.log('📋 Filtros atuais:', filters);
    
    // Analisa cada filtro
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        console.log(`✅ ${key}:`, value);
      } else {
        console.log(`❌ ${key}:`, 'vazio/nulo');
      }
    });
    
    // Monta query string para ver como seria enviada
    const queryParams = this.buildQueryString(filters);
    console.log('🌐 Query String:', queryParams);
    
    console.groupEnd();
  }

  /**
   * Constrói query string dos filtros (simula o que seria enviado para API)
   */
  static buildQueryString(filters: PublicationFilters): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });
    
    return params.toString();
  }

  /**
   * Valida se os filtros estão corretos
   */
  static validateFilters(filters: PublicationFilters): { 
    valid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];
    
    // Validação de datas
    if (filters.date_from && filters.date_to) {
      const dateFrom = new Date(filters.date_from);
      const dateTo = new Date(filters.date_to);
      
      if (dateFrom > dateTo) {
        errors.push('Data inicial não pode ser maior que data final');
      }
    }
    
    // Validação de página
    if (filters.page && filters.page < 1) {
      errors.push('Página deve ser maior que 0');
    }
    
    // Validação de limite
    if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
      errors.push('Limite deve estar entre 1 e 100');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Compara dois objetos de filtros e mostra as diferenças
   */
  static compareFilters(
    oldFilters: PublicationFilters, 
    newFilters: PublicationFilters
  ): void {
    console.group('🔄 Comparação de Filtros');
    
    const allKeys = new Set([
      ...Object.keys(oldFilters),
      ...Object.keys(newFilters)
    ]);
    
    allKeys.forEach(key => {
      const oldValue = oldFilters[key as keyof PublicationFilters];
      const newValue = newFilters[key as keyof PublicationFilters];
      
      if (oldValue !== newValue) {
        console.log(`📝 ${key}: "${oldValue}" → "${newValue}"`);
      }
    });
    
    console.groupEnd();
  }

  /**
   * Simula chamada de API para testar filtros
   */
  static async testApiCall(filters: PublicationFilters): Promise<void> {
    console.group('🧪 Teste de API');
    
    try {
      const queryString = this.buildQueryString(filters);
      const url = `/api/publications?${queryString}`;
      
      console.log('📡 URL que seria chamada:', url);
      
    } catch (error) {
      console.error('❌ Erro na simulação:', error);
    }
    
    console.groupEnd();
  }
}

/**
 * Hook para usar o debugger dos filtros em desenvolvimento
 */
export const useFiltersDebug = (enabled: boolean = process.env.NODE_ENV === 'development') => {
  const logFilters = (filters: PublicationFilters, context?: string) => {
    if (enabled) {
      FiltersDebugger.logFilters(filters, context);
    }
  };

  const validateFilters = (filters: PublicationFilters) => {
    if (enabled) {
      const validation = FiltersDebugger.validateFilters(filters);
      if (!validation.valid) {
        console.warn('⚠️ Filtros inválidos:', validation.errors);
      }
      return validation;
    }
    return { valid: true, errors: [] };
  };

  const compareFilters = (oldFilters: PublicationFilters, newFilters: PublicationFilters) => {
    if (enabled) {
      FiltersDebugger.compareFilters(oldFilters, newFilters);
    }
  };

  return {
    logFilters,
    validateFilters,
    compareFilters,
    testApiCall: enabled ? FiltersDebugger.testApiCall : () => {},
  };
};

