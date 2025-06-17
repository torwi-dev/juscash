import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { PublicationCard } from './PublicationCard';
import { LoadingSpinner } from '../common';
import type { Publication, PublicationStatus, PublicationFilters } from '@/types';
import { cn } from '@/lib/utils';
import { useInfiniteScrollColumn } from '@/hooks/useInfiniteScroll';

const COLUMN_CONFIG = {
  nova: { title: 'Novas', description: 'Publicações não lidas', color: 'bg-blue-50' },
  lida: { title: 'Lidas', description: 'Publicações lidas', color: 'bg-yellow-50' },
  enviada_adv: { title: 'Enviada Advogado', description: 'Em análise jurídica', color: 'bg-orange-50' },
  concluida: { title: 'Concluídas', description: 'Processos finalizados', color: 'bg-green-50' }
};

interface KanbanColumnProps {
  id: PublicationStatus;
  publications: Publication[];
  filters: PublicationFilters;
  onViewPublication: (publication: Publication) => void;
}

export function KanbanColumn({ id, publications, filters, onViewPublication }: KanbanColumnProps) {
  const config = COLUMN_CONFIG[id];
  
  const { 
    publications: infinitePublications, 
    isLoadingMore, 
    hasMore, 
    hasError,
    lastElementRef,
    retry
  } = useInfiniteScrollColumn(id, publications, filters);
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 min-w-0">
      <div className="p-3 bg-white rounded-t-lg border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm truncate">{config.title}</h3>
          <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
            {infinitePublications.length}
          </Badge>
        </div>
        <p className="text-xs text-gray-600 mt-1 truncate">{config.description}</p>
      </div>

      <div className="flex-1 min-h-0 relative">
        <Droppable droppableId={id} type="PUBLICATION">
          {(provided, snapshot) => (
            <div 
              className={cn(
                "absolute inset-0 overflow-y-auto overflow-x-hidden p-3",
                snapshot.isDraggingOver && "bg-blue-50"
              )}
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 transparent'
              }}
            >
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-h-full"
              >
                {infinitePublications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-center">Nenhuma publicação</div>
                    <div className="text-xs mt-1 text-center">
                      {id === 'nova' 
                        ? 'Aguardando novas publicações'
                        : 'Arraste publicações para esta coluna'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {infinitePublications.map((publication, index) => (
                      <div
                        key={`${id}-${publication.id}-${index}`}
                        ref={index === infinitePublications.length - 1 ? lastElementRef : undefined}
                      >
                        <PublicationCard
                          publication={publication}
                          index={index}
                          onView={onViewPublication}
                        />
                      </div>
                    ))}
                    
                    {isLoadingMore && (
                      <div className="flex justify-center py-3">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-xs text-gray-500">Carregando mais...</span>
                      </div>
                    )}
                    
                    {hasError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                        <div className="text-xs text-red-600 mb-2">❌ Erro ao carregar mais</div>
                        <button onClick={retry} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded">
                          🔄 Tentar novamente
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </div>

      {id === 'concluida' && (
        <div className="p-2 bg-amber-50 border-t border-amber-200 rounded-b-lg flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
            <span className="truncate">Status final - não pode ser movido</span>
          </div>
        </div>
      )}
    </div>
  );
}