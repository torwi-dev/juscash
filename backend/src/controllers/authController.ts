import { Request, Response } from 'express';
import { z } from 'zod';
import { getAuthService } from '../infrastructure/container';
import { LoginDto, RegisterDto } from '../services/AuthService';

// Schemas de validação HTTP
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const loginData: LoginDto = {
      email: validatedData.email,
      password: validatedData.password,
    };
    
    const authService = getAuthService();
    const authResult = await authService.login(loginData);

    res.json({
      message: 'Login realizado com sucesso',
      ...authResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors 
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message === 'Credenciais inválidas') {
        res.status(401).json({ error: error.message });
        return;
      }
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const registerData: RegisterDto = {
      name: validatedData.name,
      email: validatedData.email,
      password: validatedData.password,
    };
    
    const authService = getAuthService();
    const user = await authService.register(registerData);

    // ✅ CORREÇÃO: Gerar token após registrar o usuário
    const loginData: LoginDto = {
      email: registerData.email,
      password: registerData.password,
    };
    
    const authResult = await authService.login(loginData);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: authResult.user,
      token: authResult.token, // ✅ Agora retorna o token também
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors 
      });
      return;
    }

    if (error instanceof Error) {
      if (error.message.includes('já cadastrado')) {
        res.status(409).json({ error: error.message });
        return;
      }
      
      if (error.message.includes('obrigatório') || error.message.includes('inválido') || error.message.includes('deve ter')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const authService = getAuthService();
    const user = await authService.getUserById(req.user.id);
    
    res.json({ user: user.toPublicData() });
  } catch (error) {
    if (error instanceof Error && error.message === 'Usuário não encontrado') {
      res.status(404).json({ error: error.message });
      return;
    }
    
    console.error('Me error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};