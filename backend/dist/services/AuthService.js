"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const DomainErrors_1 = require("../domain/errors/DomainErrors");
class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async login(loginData) {
        const { email, password } = loginData;
        // Validações de entrada
        if (!email?.trim()) {
            throw new DomainErrors_1.ValidationError('Email é obrigatório');
        }
        if (!password) {
            throw new DomainErrors_1.ValidationError('Senha é obrigatória');
        }
        if (!this.isValidEmail(email)) {
            throw new DomainErrors_1.ValidationError('Formato de email inválido');
        }
        // Buscar usuário
        const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
        if (!user) {
            throw new DomainErrors_1.UnauthorizedError('Credenciais inválidas');
        }
        if (!user.isActive) {
            throw new DomainErrors_1.UnauthorizedError('Conta desativada. Entre em contato com o administrador');
        }
        // Verificar senha
        const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw new DomainErrors_1.UnauthorizedError('Credenciais inválidas');
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
    async register(registerData) {
        const { name, email, password, role } = registerData;
        // Validações de entrada
        if (!name?.trim()) {
            throw new DomainErrors_1.ValidationError('Nome é obrigatório');
        }
        if (name.trim().length < 2) {
            throw new DomainErrors_1.ValidationError('Nome deve ter pelo menos 2 caracteres');
        }
        if (name.trim().length > 100) {
            throw new DomainErrors_1.ValidationError('Nome deve ter no máximo 100 caracteres');
        }
        if (!email?.trim()) {
            throw new DomainErrors_1.ValidationError('Email é obrigatório');
        }
        if (!this.isValidEmail(email)) {
            throw new DomainErrors_1.ValidationError('Formato de email inválido');
        }
        if (!password) {
            throw new DomainErrors_1.ValidationError('Senha é obrigatória');
        }
        if (!this.isValidPassword(password)) {
            throw new DomainErrors_1.ValidationError('Senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial');
        }
        // Validar role se fornecida
        if (role && !Object.values(client_1.UserRole).includes(role)) {
            throw new DomainErrors_1.ValidationError(`Role inválida: ${role}`);
        }
        // Regras de negócio
        const normalizedEmail = email.toLowerCase().trim();
        // Verificar se já existe
        const existingUser = await this.userRepository.existsByEmail(normalizedEmail);
        if (existingUser) {
            throw new DomainErrors_1.AlreadyExistsError(`Email já está em uso: ${normalizedEmail}`);
        }
        // Verificar domínios bloqueados (exemplo de regra de negócio)
        const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
        const emailDomain = normalizedEmail.split('@')[1];
        if (blockedDomains.includes(emailDomain)) {
            throw new DomainErrors_1.BusinessRuleError('Domínio de email não permitido');
        }
        // Hash da senha
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // Criar usuário
        return await this.userRepository.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: role || 'operador',
        });
    }
    async getUserById(id) {
        if (!id || id < 1) {
            throw new DomainErrors_1.ValidationError('ID de usuário inválido');
        }
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new DomainErrors_1.NotFoundError('Usuário não encontrado');
        }
        if (!user.isActive) {
            throw new DomainErrors_1.UnauthorizedError('Conta desativada');
        }
        return user;
    }
    async getUserByEmail(email) {
        if (!email?.trim()) {
            throw new DomainErrors_1.ValidationError('Email é obrigatório');
        }
        if (!this.isValidEmail(email)) {
            throw new DomainErrors_1.ValidationError('Formato de email inválido');
        }
        const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
        if (!user) {
            throw new DomainErrors_1.NotFoundError('Usuário não encontrado');
        }
        return user;
    }
    async deactivateUser(id) {
        if (!id || id < 1) {
            throw new DomainErrors_1.ValidationError('ID de usuário inválido');
        }
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new DomainErrors_1.NotFoundError('Usuário não encontrado');
        }
        if (!user.isActive) {
            throw new DomainErrors_1.BusinessRuleError('Usuário já está desativado');
        }
        return await this.userRepository.deactivate(id);
    }
    generateToken(user) {
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
        return jsonwebtoken_1.default.sign(payload, jwtSecret, {
            expiresIn: '7d',
            issuer: 'juscash-dje',
            audience: 'juscash-users',
        });
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }
    isValidPassword(password) {
        if (password.length < 8 || password.length > 128)
            return false;
        if (!/[A-Z]/.test(password))
            return false;
        if (!/[a-z]/.test(password))
            return false;
        if (!/[0-9]/.test(password))
            return false;
        if (!/[^A-Za-z0-9]/.test(password))
            return false;
        // Verificar senhas muito comuns
        const commonPasswords = ['12345678', 'password', 'qwerty123', 'abc123456'];
        if (commonPasswords.includes(password.toLowerCase()))
            return false;
        return true;
    }
    // Método para validar token (útil para middleware)
    validateToken(token) {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET não configurado');
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            return {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };
        }
        catch (error) {
            throw new DomainErrors_1.UnauthorizedError('Token inválido ou expirado');
        }
    }
}
exports.AuthService = AuthService;
