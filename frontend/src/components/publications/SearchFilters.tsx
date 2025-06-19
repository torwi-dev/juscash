import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, X, Scale } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { usePublicationFilters } from '@/hooks';
import { usePublicationsStore } from '@/stores';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks';

interface SearchFiltersProps {
  onSearch?: (searchTerm: string) => void;
  className?: string;
}

export const SearchFilters = ({ onSearch, className }: SearchFiltersProps) => {
  const { filters, updateFilter, applyFilters, clearFilters, hasActiveFilters } = usePublicationFilters();
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  // Sincroniza o searchTerm com o filtro
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Debounce da busca
  const debouncedSearch = useDebounce((term: string) => {
    updateFilter('search', term);
    applyFilters();
  }, 500);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleDateFromSelect = (date: Date | undefined) => {
    if (date) {
      updateFilter('date_from', format(date, 'yyyy-MM-dd'));
    }
    setDateFromOpen(false);
    setTimeout(() => applyFilters(), 50);
  };

  const handleDateToSelect = (date: Date | undefined) => {
    if (date) {
      updateFilter('date_to', format(date, 'yyyy-MM-dd'));
    }
    setDateToOpen(false);
    setTimeout(() => applyFilters(), 50);
  };

  // Função para remover filtro individual
  const handleRemoveFilter = (filterKey: keyof typeof filters) => {    
    // Limpa estado local
    if (filterKey === 'search') {
      setSearchTerm('');
    }

    // USA O HOOK para forçar remoção
    updateFilter(filterKey, undefined);
    
    // Força aplicação com os novos filtros
    setTimeout(() => applyFilters(), 50);
  };

  // Função para limpar todos
  const handleClearAll = () => {
    setSearchTerm('');
    clearFilters();
  };

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* Header - Mobile: Stack, Desktop: Side by side */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8">
        {/* Título */}
        <div className="flex items-center flex-shrink-0">
          <Scale className="mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Publicações
          </h1>
        </div>

        {/* Filtros Container */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-stretch sm:items-end gap-3 sm:gap-4 min-w-0 flex-1 lg:flex-initial">
          {/* Search Input - Full width on mobile */}
          <div className="w-full sm:min-w-0 sm:flex-1 lg:w-64 lg:flex-initial">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
              Pesquisar
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                type="text"
                placeholder="Nº processo ou partes"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-10 border-gray-300 focus:border-primary-500 focus:ring-primary-200 w-full"
              />
            </div>
          </div>

          {/* Date Filters - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Date From */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Data Inicial
              </Label>
              <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full sm:w-40 h-10 justify-start text-left font-normal',
                      !filters.date_from && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {filters.date_from ? (
                        format(new Date(filters.date_from), 'dd/MM/yy')
                      ) : (
                        'DD/MM/AA'
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.date_from ? new Date(filters.date_from) : undefined}
                    onSelect={handleDateFromSelect}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Data Final
              </Label>
              <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full sm:w-40 h-10 justify-start text-left font-normal',
                      !filters.date_to && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {filters.date_to ? (
                        format(new Date(filters.date_to), 'dd/MM/yy')
                      ) : (
                        'DD/MM/AA'
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.date_to ? new Date(filters.date_to) : undefined}
                    onSelect={handleDateToSelect}
                    disabled={(date) => {
                      const today = new Date();
                      const fromDate = filters.date_from ? new Date(filters.date_from) : new Date('1900-01-01');
                      return date > today || date < fromDate;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200"
        >
          <span className="text-sm font-medium text-gray-600 flex-shrink-0">
            Filtros ativos:
          </span>
          
          {filters.search && (
            <Badge 
              variant="secondary" 
              className="bg-primary-100 text-primary-800 flex items-center gap-1 max-w-full"
            >
              <span className="truncate">
                Busca: "{filters.search.length > 20 ? `${filters.search.slice(0, 20)}...` : filters.search}"
              </span>
              <button
                type="button"
                className="ml-1 hover:bg-primary-200/70 rounded-full p-0.5 transition-colors focus:outline-none flex-shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveFilter('search');
                }}
                aria-label="Remover filtro de busca"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.date_from && (
            <Badge 
              variant="secondary" 
              className="bg-blue-100 text-blue-800 flex items-center gap-1 flex-shrink-0"
            >
              De: {format(new Date(filters.date_from), 'dd/MM/yyyy')}
              <button
                type="button"
                className="ml-1 hover:bg-blue-200/70 rounded-full p-0.5 transition-colors focus:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveFilter('date_from');
                }}
                aria-label="Remover filtro de data inicial"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.date_to && (
            <Badge 
              variant="secondary" 
              className="bg-blue-100 text-blue-800 flex items-center gap-1 flex-shrink-0"
            >
              Até: {format(new Date(filters.date_to), 'dd/MM/yyyy')}
              <button
                type="button"
                className="ml-1 hover:bg-blue-200/70 rounded-full p-0.5 transition-colors focus:outline-none"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveFilter('date_to');
                }}
                aria-label="Remover filtro de data final"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 h-auto rounded-md flex-shrink-0"
          >
            <X className="mr-1 h-3 w-3" />
            <span className="hidden xs:inline">Limpar todos</span>
            <span className="xs:hidden">Limpar</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
};