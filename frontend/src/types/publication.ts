export type PublicationStatus = 'nova' | 'lida' | 'enviada_adv' | 'concluida';

export interface Publication {
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
  fullContent: string;            
  status: PublicationStatus;
  contentHash: string;           
  sourceUrl: string | null;        
  scraperExecutionId: number | null; 
  createdAt: string;               
  updatedAt: string;               
}


export interface PublicationFilters {
  search?: string;
  status?: PublicationStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface PublicationResponse {
  publications: Publication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PublicationStats {
  nova: number;
  lida: number;
  enviada_adv: number;
  concluida: number;
  total: number;
}

export interface UpdateStatusRequest {
  status: PublicationStatus;
}

export interface PublicationState {
  publications: Publication[];
  stats: PublicationStats;
  filters: PublicationFilters;
  isLoading: boolean;
  error: string | null;
  selectedPublication: Publication | null;
}

export interface PublicationActions {
  fetchPublications: (filters?: PublicationFilters) => Promise<void>;
  updateStatus: (id: number, status: PublicationStatus) => Promise<void>;
  setFilters: (filters: PublicationFilters) => void;
  setSelectedPublication: (publication: Publication | null) => void;
  clearError: () => void;
   searchPublications: (searchTerm: string, filters?: PublicationFilters) => Promise<void>;
  movePublicationInKanban: (publicationId: number, fromStatus: PublicationStatus, toStatus: PublicationStatus) => void;
}