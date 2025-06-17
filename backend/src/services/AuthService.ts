import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../domain/interfaces/IUserRepository';
import { User } from '../domain/entities/User';
import { UserRole } from '@prisma/client';
import { 
  ValidationError,
  UnauthorizedError,
  AlreadyExistsError,
  NotFoundError,
  BusinessRuleError 
} from '../domain/errors/DomainErrors';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResult {
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
  token: string;
}

export class AuthService {
  constructor(private userRepository: IUserRepository) {}

  async login(loginData: LoginDto): Promise<AuthResult> {
    const { email, password } = loginData;

    // Validações de entrada
    if (!email?.trim()) {
      throw new ValidationError('Email é obrigatório');
    }

    if (!password) {
      throw new ValidationError('Senha é obrigatória');
    }

    if (!this.isValidEmail(email)) {
      throw new ValidationError('Formato de email inválido');
    }

    // Buscar usuário
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    
    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Conta desativada. Entre em contato com o administrador');
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    // Atualizar último login
    await this.userRepository.updateLastLogin(user.id);

    // Gerar token
    const token = this.generateToken(user);

    return {
      user: user.toPublicData(),
      token,
    };
  }

  async register(registerData: RegisterDto): Promise<User> {
    const { name, email, password, role } = registerData;

    // Validações de entrada
    if (!name?.trim()) {
      throw new ValidationError('Nome é obrigatório');
    }

    if (name.trim().length < 2) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
    }

    if (name.trim().length > 100) {
      throw new ValidationError('Nome deve ter no máximo 100 caracteres');
    }

    if (!email?.trim()) {
      throw new ValidationError('Email é obrigatório');
    }

    if (!this.isValidEmail(email)) {
      throw new ValidationError('Formato de email inválido');
    }

    if (!password) {
      throw new ValidationError('Senha é obrigatória');
    }

    if (!this.isValidPassword(password)) {
      throw new ValidationError(
        'Senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial'
      );
    }

    // Validar role se fornecida
    if (role && !Object.values(UserRole).includes(role)) {
      throw new ValidationError(`Role inválida: ${role}`);
    }

    // Regras de negócio
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verificar se já existe
    const existingUser = await this.userRepository.existsByEmail(normalizedEmail);
    if (existingUser) {
      throw new AlreadyExistsError(`Email já está em uso: ${normalizedEmail}`);
    }

    // Verificar domínios bloqueados (exemplo de regra de negócio)
    const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    const emailDomain = normalizedEmail.split('@')[1];
    if (blockedDomains.includes(emailDomain)) {
      throw new BusinessRuleError('Domínio de email não permitido');
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 12);

    // Criar usuário
    return await this.userRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role || 'operador',
    });
  }

  async getUserById(id: number): Promise<User> {
    if (!id || id < 1) {
      throw new ValidationError('ID de usuário inválido');
    }

    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Conta desativada');
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    if (!email?.trim()) {
      throw new ValidationError('Email é obrigatório');
    }

    if (!this.isValidEmail(email)) {
      throw new ValidationError('Formato de email inválido');
    }

    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return user;
  }

  async deactivateUser(id: number): Promise<User> {
    if (!id || id < 1) {
      throw new ValidationError('ID de usuário inválido');
    }

    const user = await this.userRepository.findById(id);
    
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw new BusinessRuleError('Usuário já está desativado');
    }

    return await this.userRepository.deactivate(id);
  }

private generateToken(user: User): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado - erro de configuração do servidor');
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, jwtSecret, { 
    expiresIn: '7d',
    issuer: 'juscash-dje',
    audience: 'juscash-users',
  });
}

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private isValidPassword(password: string): boolean {
    if (password.length < 8 || password.length > 128) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    
    // Verificar senhas muito comuns
    const commonPasswords = ['12345678', 'password', 'qwerty123', 'abc123456'];
    if (commonPasswords.includes(password.toLowerCase())) return false;
    
    return true;
  }

  // Método para validar token (útil para middleware)
  validateToken(token: string): { userId: number; email: string; role: UserRole } {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      throw new UnauthorizedError('Token inválido ou expirado');
    }
  }
}