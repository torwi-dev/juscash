"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.register = exports.login = void 0;
const zod_1 = require("zod");
const container_1 = require("../infrastructure/container");
// Schemas de validação HTTP
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(1, 'Senha é obrigatória'),
});
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});
const login = async (req, res) => {
    try {
        const validatedData = loginSchema.parse(req.body);
        const loginData = {
            email: validatedData.email,
            password: validatedData.password,
        };
        const authService = (0, container_1.getAuthService)();
        const authResult = await authService.login(loginData);
        res.json({
            message: 'Login realizado com sucesso',
            ...authResult,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.login = login;
const register = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const registerData = {
            name: validatedData.name,
            email: validatedData.email,
            password: validatedData.password,
        };
        const authService = (0, container_1.getAuthService)();
        const user = await authService.register(registerData);
        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: user.toPublicData(),
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.register = register;
const me = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Usuário não autenticado' });
            return;
        }
        const authService = (0, container_1.getAuthService)();
        const user = await authService.getUserById(req.user.id);
        res.json({ user: user.toPublicData() });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Usuário não encontrado') {
            res.status(404).json({ error: error.message });
            return;
        }
        console.error('Me error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
exports.me = me;
