import { apiClient } from './api';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  User 
} from '@/types';

export class AuthService {
  private readonly endpoints = {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    logout: '/api/auth/logout',
  };

  /**
   * Realiza login do usuário
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(
        this.endpoints.login, 
        credentials
      );

      // Salva o token no localStorage
      if (response.token) {
        localStorage.setItem('juscash_token', response.token);
        localStorage.setItem('juscash_user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  /**
   * Registra novo usuário
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Remove confirmPassword antes de enviar para o backend
      const { confirmPassword, ...dataToSend } = userData;
      
      const response = await apiClient.post<RegisterResponse>(
        this.endpoints.register, 
        dataToSend
      );

      // Salva o token no localStorage automaticamente após registro
      if (response.token) {
        localStorage.setItem('juscash_token', response.token);
        localStorage.setItem('juscash_user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  }

  /**
   * Busca dados do usuário atual
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>(this.endpoints.me);
      
      // Atualiza dados do usuário no localStorage
      localStorage.setItem('juscash_user', JSON.stringify(response));
      
      return response;
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      throw error;
    }
  }

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<void> {
    try {
      // Tenta fazer logout no backend (opcional)
      await apiClient.post(this.endpoints.logout);
    } catch (error) {
      // Ignora erros de logout no backend
      console.warn('Erro no logout do backend (ignorado):', error);
    } finally {
      // Sempre limpa o localStorage
      this.clearLocalStorage();
    }
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('juscash_token');
    const user = localStorage.getItem('juscash_user');
    
    return !!(token && user);
  }

  /**
   * Obtém o token do localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('juscash_token');
  }

  /**
   * Obtém dados do usuário do localStorage
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('juscash_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Erro ao parsear usuário do localStorage:', error);
      return null;
    }
  }

  /**
   * Limpa dados de autenticação do localStorage
   */
  clearLocalStorage(): void {
    localStorage.removeItem('juscash_token');
    localStorage.removeItem('juscash_user');
  }

  /**
   * Verifica se o token está expirado (básico)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // Decodifica o JWT para verificar expiração
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      return payload.exp < now;
    } catch (error) {
      console.error('Erro ao verificar expiração do token:', error);
      return true;
    }
  }

  /**
   * Renova o token se necessário
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.isAuthenticated() || this.isTokenExpired()) {
      this.clearLocalStorage();
      return false;
    }

    try {
      // Verifica se o usuário ainda é válido fazendo uma requisição
      await this.getCurrentUser();
      return true;
    } catch (error) {
      this.clearLocalStorage();
      return false;
    }
  }

  /**
   * Obtém as permissões do usuário baseado no role
   */
  getUserPermissions(): {
    canManagePublications: boolean;
    canViewStats: boolean;
    canManageUsers: boolean;
    isReadonly: boolean;
  } {
    const user = this.getStoredUser();
    if (!user) {
      return {
        canManagePublications: false,
        canViewStats: false,
        canManageUsers: false,
        isReadonly: true,
      };
    }

    const { role } = user;
    
    return {
      canManagePublications: ['admin', 'operador'].includes(role),
      canViewStats: ['admin', 'operador', 'readonly'].includes(role),
      canManageUsers: role === 'admin',
      isReadonly: role === 'readonly',
    };
  }
}

// Exporta uma instância única
export const authService = new AuthService();