import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { ROUTES } from '@/utils/constants';

/**
 * Hook para proteger rotas que requerem autenticação
 */
export const useRequireAuth = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      const isValid = await checkAuthStatus();
      
      if (!isValid) {
        // Salva a rota atual para redirecionamento após login
        const from = location.pathname !== ROUTES.LOGIN 
          ? location.pathname 
          : ROUTES.DASHBOARD;
          
        navigate(ROUTES.LOGIN, { 
          replace: true,
          state: { from }
        });
      }
    };

    if (!isAuthenticated && !isLoading) {
      verifyAuth();
    }
  }, [isAuthenticated, isLoading, checkAuthStatus, navigate, location]);

  return { isAuthenticated, isLoading };
};

/**
 * Hook para redirecionamento de usuários já autenticados
 */
export const useRedirectIfAuthenticated = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      // Redireciona para a rota original ou dashboard
      const from = location.state?.from || ROUTES.DASHBOARD;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return { isAuthenticated };
};

/**
 * Hook para verificar permissões do usuário
 */
export const usePermissions = () => {
   const hasPermission = useAuthStore((state) => state.hasPermission);
  const isRole = useAuthStore((state) => state.isRole);
  const user = useAuthStore((state) => state.user);

  return {
    canManagePublications: hasPermission('manage_publications'),
    canViewStats: hasPermission('view_stats'),
    canManageUsers: hasPermission('manage_users'),
    isAdmin: isRole('admin'),
    isOperator: isRole('operador'),
    isReadonly: isRole('readonly'),
    isScraper: isRole('scraper_service'),
    userRole: user?.role,
  };
};

/**
 * Hook para login com loading e error handling
 */
export const useLogin = () => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      await login(credentials);
      
      // Redireciona para a rota original ou dashboard
      const from = location.state?.from || ROUTES.DASHBOARD;
      navigate(from, { replace: true });
      
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  return {
    login: handleLogin,
    isLoading,
    error,
    clearError,
  };
};

/**
 * Hook para registro com loading e error handling
 */
export const useRegister = () => {
const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const register = useAuthStore((state) => state.register);
  const clearError = useAuthStore((state) => state.clearError);
  const navigate = useNavigate();

  const handleRegister = async (userData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      await register(userData);
      
      // Redireciona para dashboard após registro
      navigate(ROUTES.DASHBOARD, { replace: true });
      
    } catch (error) {
      console.error('Erro no registro:', error);
    }
  };

  return {
    register: handleRegister,
    isLoading,
    error,
    clearError,
  };
};

/**
 * Hook para logout com confirmação
 */
export const useLogout = () => {
 const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return { logout: handleLogout };
};

