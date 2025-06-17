import axios, { 
  AxiosInstance, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import type { ApiResponse, ApiError } from '@/types';
import { API_BASE_URL, STORAGE_KEYS } from '@/utils/constants';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - adiciona token de autenticação
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log da requisição em desenvolvimento
        if (import.meta.env.DEV) {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            params: config.params,
          });
        }

        return config;
      },
      (error: AxiosError) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - trata respostas e erros
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log da resposta em desenvolvimento
        if (import.meta.env.DEV) {
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        return response;
      },
      (error: AxiosError<ApiError>) => {
        console.error('❌ Response error:', error);

        // Se o token expirou ou é inválido, limpa o localStorage
        if (error.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          
          // Redireciona para login se não estiver na página de login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        // Formata o erro para um formato consistente
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'Erro desconhecido',
          statusCode: error.response?.status || 500,
          error: error.response?.data?.error,
          details: error.response?.data?.details,
        };

        return Promise.reject(apiError);
      }
    );
  }

  // Métodos HTTP genéricos
  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, { params });
    return response.data.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url);
    return response.data.data;
  }

  // Método para fazer upload de arquivos
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.instance.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  }

  // Método para cancelar requisições
  createCancelToken() {
    return axios.CancelToken.source();
  }

  // Método para verificar se o erro é de cancelamento
  isCancel(error: any): boolean {
    return axios.isCancel(error);
  }

  // Getter para acessar a instância do axios diretamente se necessário
  get axios(): AxiosInstance {
    return this.instance;
  }
}

// Exporta uma instância única (singleton)
export const apiClient = new ApiClient();

// Exporta também a classe para casos específicos
export { ApiClient };