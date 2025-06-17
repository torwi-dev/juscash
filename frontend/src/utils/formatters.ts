import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Formatação de datas
export const formatDate = (
  date: string | Date, 
  formatStr: string = 'dd/MM/yyyy'
): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';
    return format(dateObj, formatStr, { locale: ptBR });
  } catch {
    return '--';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

export const formatDateForInput = (date: string | Date): string => {
  return formatDate(date, 'yyyy-MM-dd');
};

export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '--';
    
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return formatDate(dateObj);
  } catch {
    return '--';
  }
};

// Formatação de valores monetários
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  
  return new Intl.NumberFormat('pt-BR').format(value);
};

// Formatação de texto
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const formatProcessNumber = (processNumber?: string): string => {
  if (!processNumber) return 'N/A';
  
  // Remove tudo que não é número ou hífen
  const cleaned = processNumber.replace(/[^\d-]/g, '');
  
  // Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
  if (cleaned.length >= 13) {
    return cleaned.replace(
      /(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/,
      '$1-$2.$3.$4.$5.$6'
    );
  }
  
  return processNumber;
};

// Formatação de arrays
export const formatAuthors = (authors: string[]): string => {
  if (!authors || authors.length === 0) return 'Não informado';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return authors.join(' e ');
  return `${authors.slice(0, -1).join(', ')} e ${authors[authors.length - 1]}`;
};

export const formatLawyers = (lawyers: string[]): string => {
  if (!lawyers || lawyers.length === 0) return 'Não informado';
  
  return lawyers.map(lawyer => {
    // Extrai OAB se presente no formato "Nome (OAB: 123456/SP)"
    const oabMatch = lawyer.match(/\(OAB:\s*([^)]+)\)/);
    return oabMatch ? lawyer : lawyer;
  }).join(', ');
};

// Formatação de status
export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    nova: 'Nova Publicação',
    lida: 'Publicação Lida',
    enviada_adv: 'Enviada para Advogado',
    concluida: 'Concluída',
  };
  
  return statusMap[status] || status;
};

// Utilitários de formatação
export const removeAccents = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const formatSearchHighlight = (text: string, searchTerm: string): string => {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
};