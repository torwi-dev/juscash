export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'scraper_service' | 'readonly';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_in: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
  message: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
    refreshUser: () => Promise<User>;
  checkAuthStatus: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  isRole: (role: string) => boolean;
}