import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common';
import { PublicationModal } from '@/components/publications/PublicationModal';

import { useKanbanBoard, usePublicationModal, useStatusTransitions } from '@/hooks';
import type { Publication, PublicationStatus } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { usePublicationsStore } from '@/stores';

export function KanbanBoard() {
  const { 
    kanbanData, 
    isLoading, 
    movePublication 
  } = useKanbanBoard();

  const { publication: selectedPublication, isOpen, open, close } = usePublicationModal();
  const { canTransition, getTransitionError } = useStatusTransitions();

  const columns: PublicationStatus[] = ['nova', 'lida', 'enviada_adv', 'concluida'];
  const filters = usePublicationsStore((state) => state.filters);
  // Estado local para reordenação otimista
  const [localKanbanData, setLocalKanbanData] = React.useState(kanbanData);

  // Sincroniza dados externos com estado local
  React.useEffect(() => {
    setLocalKanbanData(kanbanData);
  }, [kanbanData]);

  // Função específica para reordenação apenas visual
  function reorderInSameColumn(
    publications: Publication[], 
    sourceIndex: number, 
    destinationIndex: number,
    columnId: PublicationStatus
  ) {
    const newPublications = [...publications];
    const [movedPublication] = newPublications.splice(sourceIndex, 1);
    newPublications.splice(destinationIndex, 0, movedPublication);
    
    // Atualiza apenas o estado local - SEM chamada de API
    setLocalKanbanData(prev => ({
      ...prev,
      [columnId]: newPublications
    }));
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    // Se não há destino, cancelar
    if (!destination) return;

    // Se está na mesma posição, cancelar
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as PublicationStatus;
    const destinationStatus = destination.droppableId as PublicationStatus;
    const publicationId = parseInt(draggableId);

    // MOVIMENTO INTRA-COLUNA: Apenas reordenação visual
    if (sourceStatus === destinationStatus) {
      // Reordenação simples - apenas visual, sem API
      reorderInSameColumn(
        localKanbanData[sourceStatus],
        source.index,
        destination.index,
        sourceStatus
      );
      return; // Sem try/catch - é apenas local
    }

    // MOVIMENTO INTER-COLUNA: Validar transição
    if (!canTransition(sourceStatus, destinationStatus)) {
      const error = getTransitionError(sourceStatus, destinationStatus);
      toast.error('Movimento não permitido', {
        description: error || 'Esta transição não é permitida',
      });
      return;
    }

    // Atualização otimista para movimento entre colunas
    const newKanbanData = { ...localKanbanData };
    const sourcePublications = [...newKanbanData[sourceStatus]];
    const destPublications = [...newKanbanData[destinationStatus]];
    
    // Remove da origem
    const [movedPublication] = sourcePublications.splice(source.index, 1);
    
    // Atualiza status e adiciona ao destino
    movedPublication.status = destinationStatus;
    destPublications.splice(destination.index, 0, movedPublication);
    
    newKanbanData[sourceStatus] = sourcePublications;
    newKanbanData[destinationStatus] = destPublications;
    setLocalKanbanData(newKanbanData);

    try {
      // Move a publicação com mudança de status
      await movePublication(publicationId, sourceStatus, destinationStatus, destination.index);
      
      toast.success('✅ Publicação movida', {
        description: `${formatStatus(sourceStatus)} → ${formatStatus(destinationStatus)}`,
      });
    } catch (error) {
      // Reverte em caso de erro
      setLocalKanbanData(kanbanData);
      toast.error('Erro ao mover publicação', {
        description: 'A publicação foi restaurada para a posição original',
      });
    }
  }

  function formatStatus(status: PublicationStatus): string {
    const statusMap = {
      nova: 'Nova',
      lida: 'Lida',
      enviada_adv: 'Enviada Advogado',
      concluida: 'Concluída'
    };
    return statusMap[status] || status;
  }

  if (isLoading && Object.values(localKanbanData).every(arr => arr.length === 0)) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando publicações..." />
      </div>
    );
  }

  
  
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            {columns.map((columnId) => (
              <KanbanColumn
                key={columnId}
                id={columnId}
                publications={localKanbanData[columnId] || []}
                onViewPublication={open}
                filters={filters}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {selectedPublication && (
        <PublicationModal
          publication={selectedPublication}
          isOpen={isOpen}
          onClose={close}
        />
      )}
    </div>
  );
}