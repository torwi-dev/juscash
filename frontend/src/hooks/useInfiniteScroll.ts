// hooks/useInfiniteScrollColumn.ts - Hook para UMA coluna específica
import { useState, useCallback, useRef, useEffect } from 'react';
import { PublicationStatus, PublicationFilters, Publication } from '@/types';
import { publicationsService } from '@/services';

export const useInfiniteScrollColumn = (
  status: PublicationStatus,
  initialData: Publication[],
  filters: PublicationFilters
  // REMOVIDO initialMeta
) => {
  const [publications, setPublications] = useState(initialData);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length >= 30);
  const [hasError, setHasError] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset quando dados iniciais mudarem
  useEffect(() => {
    setPublications(initialData);
    setCurrentPage(1);
    setHasMore(initialData.length >= 30);
    setHasError(false);
  }, [initialData]);

  // Reset quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(initialData.length >= 30);
    setHasError(false);
  }, [filters, initialData.length]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || hasError) {
      console.log(`⏸️ loadMore cancelado para ${status}:`, {
        isLoadingMore,
        hasMore,
        hasError
      });
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      console.log(`📥 Carregando página ${nextPage} para ${status}`);

      const response = await publicationsService.getPublicationsByStatus(status, {
        ...filters,
        page: nextPage,
        limit: 30,
      });

      if (response.publications.length === 0) {
        console.log(`✅ Não há mais dados para ${status}`);
        setHasMore(false);
      } else {
        console.log(`✅ Carregados ${response.publications.length} itens para ${status}`);
        setPublications(prev => [...prev, ...response.publications]);
        setCurrentPage(nextPage);
        
        // USA A PAGINAÇÃO PARA CALCULAR SE TEM MAIS
      const hasMoreData = currentPage < response.pagination.pages && response.publications.length >= 30;
    setHasMore(hasMoreData);

    console.log(`📊 ${status} - Página ${currentPage}/${response.pagination.pages} - HasMore: ${hasMoreData}`);
        setHasError(false);
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar mais ${status}:`, error);
      setHasError(true);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [status, filters, currentPage, isLoadingMore, hasMore, hasError]);

  // Intersection Observer - melhorado
const lastElementRef = useCallback((node: HTMLDivElement) => {
  if (isLoadingMore || hasError || !hasMore) return; // ADICIONE !hasMore
  
  if (observerRef.current) observerRef.current.disconnect();
  
  observerRef.current = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore && !hasError) { // hasMore já está aqui
      console.log(`🔍 Último elemento visível para ${status}, carregando mais...`);
      loadMore();
    }
  }, { threshold: 0.1 });
  
  if (node) observerRef.current.observe(node);
}, [isLoadingMore, hasMore, hasError, loadMore, status]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    publications,
    isLoadingMore,
    hasMore,
    hasError,
    lastElementRef,
    retry: () => {
      setHasError(false);
      setHasMore(true);
      loadMore();
    }
  };
};