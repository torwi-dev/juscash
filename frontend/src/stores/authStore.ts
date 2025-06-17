import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest, AuthState, AuthActions } from '@/types';
import { authService } from '@/services';

interface AuthStore extends AuthState, AuthActions {}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // Estado inicial
      user: authService.getStoredUser(),
      token: authService.getToken(),
      isAuthenticated: authService.isAuthenticated(),
      isLoading: false,
      error: null,

      // Ações
      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authService.login(credentials);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Erro ao fazer login',
          });
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authService.register(data);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Erro ao registrar usuário',
          });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Ações extras para gerenciamento do estado
      refreshUser: async () => {
        try {
          set({ isLoading: true });
          
          const user = await authService.getCurrentUser();
          
          set({
            user,
            isLoading: false,
            error: null,
          });

          return user;
        } catch (error: any) {
          // Se falhar ao buscar usuário, limpa o estado
          get().logout();
          throw error;
        }
      },

      checkAuthStatus: async () => {
        try {
          const isValid = await authService.refreshTokenIfNeeded();
          
          if (!isValid) {
            get().logout();
            return false;
          }

          // Se ainda não tem usuário, busca do servidor
          if (!get().user) {
            await get().refreshUser();
          }

          return true;
        } catch (error) {
          get().logout();
          return false;
        }
      },

      hasPermission: (permission: string): boolean => {
        const { user } = get();
        if (!user) return false;

        const permissions = authService.getUserPermissions();
        
        switch (permission) {
          case 'manage_publications':
            return permissions.canManagePublications;
          case 'view_stats':
            return permissions.canViewStats;
          case 'manage_users':
            return permissions.canManageUsers;
          default:
            return false;
        }
      },

      isRole: (role: string): boolean => {
        const { user } = get();
        return user?.role === role;
      },

    }),
    {
      name: 'auth-store',
      // Não persiste dados sensíveis no devtools
      serialize: {
        options: {
          map: {
            token: () => '[HIDDEN]',
          },
        },
      },
    }
  )
);
