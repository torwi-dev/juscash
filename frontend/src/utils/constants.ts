import type { PublicationStatus } from '@/types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_TITLE || 'JusCash DJE',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  description: 'Sistema de Automação Judicial - Diário da Justiça Eletrônico',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'juscash_token',
  USER: 'juscash_user',
  FILTERS: 'juscash_filters',
} as const;

export const PUBLICATION_STATUS: Record<PublicationStatus, string> = {
  nova: 'Nova Publicação',
  lida: 'Publicação Lida',
  enviada_adv: 'Enviada para Advogado',
  concluida: 'Concluída',
};

export const PUBLICATION_STATUS_COLORS: Record<PublicationStatus, string> = {
  nova: 'bg-blue-100 text-blue-800 border-blue-200',
  lida: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  enviada_adv: 'bg-purple-100 text-purple-800 border-purple-200',
  concluida: 'bg-green-100 text-green-800 border-green-200',
};

export const KANBAN_COLUMNS: Array<{
  id: PublicationStatus;
  title: string;
  description: string;
  color: string;
}> = [
  {
    id: 'nova',
    title: 'Nova Publicação',
    description: 'Publicações extraídas automaticamente',
    color: 'border-blue-200 bg-blue-50',
  },
  {
    id: 'lida',
    title: 'Publicação Lida',
    description: 'Publicações revisadas e classificadas',
    color: 'border-yellow-200 bg-yellow-50',
  },
  {
    id: 'enviada_adv',
    title: 'Enviada para Advogado',
    description: 'Encaminhadas para análise jurídica',
    color: 'border-purple-200 bg-purple-50',
  },
  {
    id: 'concluida',
    title: 'Concluída',
    description: 'Publicações finalizadas',
    color: 'border-green-200 bg-green-50',
  },
];

export const VALID_STATUS_TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  nova: ['lida'],
  lida: ['enviada_adv'],
  enviada_adv: ['concluida', 'lida'], // Pode voltar para lida
  concluida: [], // Não pode mover para nenhum lugar
};

export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
  INPUT: 'yyyy-MM-dd',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 30,
  MAX_LIMIT: 100,
} as const;