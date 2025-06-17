// components/kanban/PublicationCard.tsx - Ajustado para scroll infinito
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Clock, Calendar, Eye, GripVertical } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import type { Publication } from '@/types';
import { formatDate, formatProcessNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface PublicationCardProps {
  publication: Publication;
  index: number;
  onView: (publication: Publication) => void;
  isLastElement?: boolean; // ✅ Nova prop para scroll infinito
  onLastElementRef?: (node: HTMLDivElement) => void; // ✅ Ref para intersection observer
}

export function PublicationCard({ 
  publication, 
  index, 
  onView, 
  isLastElement = false,
  onLastElementRef 
}: PublicationCardProps) {
  return (
    <Draggable draggableId={publication.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={(node) => {
            provided.innerRef(node);
            // ✅ Adiciona ref para scroll infinito no último elemento
            if (isLastElement && onLastElementRef && node) {
              onLastElementRef(node);
            }
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "transition-transform duration-150 cursor-grab active:cursor-grabbing w-full",
            snapshot.isDragging && "rotate-2 shadow-lg scale-105 z-50"
          )}
        >
          <Card className="border-l-4 border-l-blue-500 bg-white w-full shadow-sm hover:shadow-md transition-shadow duration-150">
            <div className="p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-2 truncate">
                    {formatProcessNumber(publication.processNumber)}
                  </h4>
                  
                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {formatDate(publication.updatedAt, 'dd/MM HH:mm')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {formatDate(publication.publicationDate)}
                      </span>
                    </span>
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(publication);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver detalhes
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
}

export function PublicationCardSkeleton() {
  return (
    <Card className="mb-2">
      <div className="p-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-7 bg-gray-200 rounded" />
      </div>
    </Card>
  );
}