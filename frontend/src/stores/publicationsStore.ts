// src/stores/publicationsStore.ts - COMPLETO COM METADADOS
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  Publication, 
  PublicationFilters, 
  PublicationStats, 
  PublicationStatus,
  PublicationState,
  PublicationActions 
} from '@/types';
import { publicationsService } from '@/services';
import { PAGINATION } from '@/utils/constants';

interface PublicationsStore extends PublicationState, PublicationActions {
  kanbanData: {
    nova: Publication[];
    lida: Publication[];
    enviada_adv: Publication[];
    concluida: Publication[];
  };
  
  kanbanMeta: {
    nova: { total: number; hasMore: boolean; currentPage: number };
    lida: { total: number; hasMore: boolean; currentPage: number };
    enviada_adv: { total: number; hasMore: boolean; currentPage: number };
    concluida: { total: number; hasMore: boolean; currentPage: number };
  };
  
  isLoadingKanban: boolean;
  
  loadKanbanData: (filters?: PublicationFilters) => Promise<void>;
  movePublication: (
    publicationId: number, 
    fromStatus: PublicationStatus, 
    toStatus: PublicationStatus,
    position?: number
  ) => Promise<void>;
  movePublicationToPosition: (
    publicationId: number, 
    fromStatus: PublicationStatus, 
    toStatus: PublicationStatus,
    position: number
  ) => Promise<void>;
  movePublicationInKanban: (
    publicationId: number, 
    fromStatus: PublicationStatus, 
    toStatus: PublicationStatus
  ) => void;
  movePublicationOptimistic: (
    publicationId: number,
    fromStatus: PublicationStatus,
    toStatus: PublicationStatus,
    position?: number
  ) => void;
  revertOptimisticMove: (
    publicationId: number,
    fromStatus: PublicationStatus,
    toStatus: PublicationStatus
  ) => void;
  addPublicationToColumn: (publication: Publication, status: PublicationStatus) => void;
  removePublicationFromColumn: (publicationId: number, status: PublicationStatus) => void;
  loadMore: (status: PublicationStatus) => Promise<void>;
  updateColumnMeta: (status: PublicationStatus, meta: { total: number; hasMore: boolean; currentPage: number }) => void;
}

export const usePublicationsStore = create<PublicationsStore>()(
  devtools(
    (set, get) => ({
      publications: [],
      stats: {
        nova: 0,
        lida: 0,
        enviada_adv: 0,
        concluida: 0,
        total: 0,
      },
      filters: {
        page: PAGINATION.DEFAULT_PAGE,
        limit: PAGINATION.DEFAULT_LIMIT,
      },
      isLoading: false,
      isLoadingKanban: false,
      error: null,
      selectedPublication: null,
      kanbanData: {
        nova: [],
        lida: [],
        enviada_adv: [],
        concluida: [],
      },
      kanbanMeta: {
        nova: { total: 0, hasMore: false, currentPage: 1 },
        lida: { total: 0, hasMore: false, currentPage: 1 },
        enviada_adv: { total: 0, hasMore: false, currentPage: 1 },
        concluida: { total: 0, hasMore: false, currentPage: 1 },
      },

      fetchPublications: async (filters?: PublicationFilters) => {
        try {
          set({ isLoading: true, error: null });
          const finalFilters = { ...get().filters, ...filters };
          set({ filters: finalFilters });
          const response = await publicationsService.getPublications(finalFilters);
          set({ publications: response.publications, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Erro ao carregar publicações' });
          throw error;
        }
      },

      updateStatus: async (id: number, status: PublicationStatus) => {
        try {
          const publication = await publicationsService.updatePublicationStatus(id, status);
          set((state) => ({
            publications: state.publications.map((p) => p.id === id ? publication : p),
          }));
          get().fetchStats();
          return publication;
        } catch (error: any) {
          set({ error: error.message || 'Erro ao atualizar status' });
          throw error;
        }
      },

      setFilters: (filters: PublicationFilters) => {
        set({ filters });
      },

      setSelectedPublication: (publication: Publication | null) => {
        set({ selectedPublication: publication });
      },

      clearError: () => {
        set({ error: null });
      },

      loadKanbanData: async (filters?: PublicationFilters) => {
        if (get().isLoadingKanban) return;
        try {
          set({ isLoadingKanban: true, error: null });
          const finalFilters = { ...get().filters, ...filters };
          const response = await publicationsService.getPublicationsForKanban(finalFilters);
          set({
            kanbanData: response.kanbanData, // PEGUE kanbanData da resposta
            isLoadingKanban: false,
          });
        } catch (error: any) {
          set({ isLoadingKanban: false, error: error.message || 'Erro ao carregar dados do Kanban' });
          throw error;
        }
      },

      updateColumnMeta: (status: PublicationStatus, meta: { total: number; hasMore: boolean; currentPage: number }) => {
        set((state) => ({
          kanbanMeta: { ...state.kanbanMeta, [status]: meta }
        }));
      },

      movePublication: async (publicationId: number, fromStatus: PublicationStatus, toStatus: PublicationStatus, position?: number) => {
        try {
          await get().updateStatus(publicationId, toStatus);
          if (position !== undefined) {
            set((state) => {
              const newKanbanData = { ...state.kanbanData };
              const fromArray = [...newKanbanData[fromStatus]];
              const pubIndex = fromArray.findIndex(p => p.id === publicationId);
              if (pubIndex !== -1) {
                const [publication] = fromArray.splice(pubIndex, 1);
                publication.status = toStatus;
                const toArray = [...newKanbanData[toStatus]];
                toArray.splice(position, 0, publication);
                newKanbanData[fromStatus] = fromArray;
                newKanbanData[toStatus] = toArray;
              }
              return { kanbanData: newKanbanData };
            });
          }
        } catch (error: any) {
          set({ error: error.message || 'Erro ao mover publicação' });
          throw error;
        }
      },

      movePublicationToPosition: async (publicationId: number, fromStatus: PublicationStatus, toStatus: PublicationStatus, position: number) => {
        return get().movePublication(publicationId, fromStatus, toStatus, position);
      },

      movePublicationInKanban: (publicationId: number, fromStatus: PublicationStatus, toStatus: PublicationStatus) => {
        set((state) => {
          const newKanbanData = { ...state.kanbanData };
          const fromArray = [...(newKanbanData[fromStatus] || [])];
          const toArray = [...(newKanbanData[toStatus] || [])];
          const publicationIndex = fromArray.findIndex(p => p.id === publicationId);
          if (publicationIndex === -1) return state;
          const [publication] = fromArray.splice(publicationIndex, 1);
          publication.status = toStatus;
          toArray.unshift(publication);
          newKanbanData[fromStatus] = fromArray;
          newKanbanData[toStatus] = toArray;
          return { kanbanData: newKanbanData };
        });
      },

      movePublicationOptimistic: (publicationId: number, fromStatus: PublicationStatus, toStatus: PublicationStatus, position?: number) => {
        set((state) => {
          const newKanbanData = { ...state.kanbanData };
          const fromArray = [...newKanbanData[fromStatus]];
          const publicationIndex = fromArray.findIndex(p => p.id === publicationId);
          if (publicationIndex === -1) return state;
          const [publication] = fromArray.splice(publicationIndex, 1);
          publication.status = toStatus;
          const toArray = [...newKanbanData[toStatus]];
          if (position !== undefined && position >= 0 && position <= toArray.length) {
            toArray.splice(position, 0, publication);
          } else {
            toArray.push(publication);
          }
          newKanbanData[fromStatus] = fromArray;
          newKanbanData[toStatus] = toArray;
          return { kanbanData: newKanbanData };
        });
      },

      revertOptimisticMove: (publicationId: number, fromStatus: PublicationStatus, toStatus: PublicationStatus) => {
        get().movePublicationOptimistic(publicationId, toStatus, fromStatus);
      },

      addPublicationToColumn: (publication: Publication, status: PublicationStatus) => {
        set((state) => ({
          kanbanData: { ...state.kanbanData, [status]: [publication, ...state.kanbanData[status]] },
        }));
      },

      removePublicationFromColumn: (publicationId: number, status: PublicationStatus) => {
        set((state) => ({
          kanbanData: { ...state.kanbanData, [status]: state.kanbanData[status].filter(p => p.id !== publicationId) },
        }));
      },

      loadMore: async (status: PublicationStatus) => {
        try {
          const currentPublications = get().kanbanData[status];
          const page = Math.floor(currentPublications.length / 30) + 1;
          const response = await publicationsService.getPublicationsByStatus(status, {
            ...get().filters,
            page,
            limit: 30,
          });
          if (response.publications.length > 0) {
            set((state) => ({
              kanbanData: { ...state.kanbanData, [status]: [...state.kanbanData[status], ...response.publications] },
            }));
          }
        } catch (error: any) {
          console.error(`Erro ao carregar mais publicações ${status}:`, error);
        }
      },

      searchPublications: async (searchTerm: string, filters?: PublicationFilters) => {
        try {
          set({ isLoading: true, error: null });
          const finalFilters = { ...get().filters, ...filters };
          const response = await publicationsService.searchPublications(searchTerm, finalFilters);
          set({ publications: response.publications, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error.message || 'Erro na busca' });
          throw error;
        }
      },
    }),
    { name: 'publications-store' }
  )
);