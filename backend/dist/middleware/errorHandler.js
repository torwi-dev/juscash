"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = void 0;
const zod_1 = require("zod");
const errors_1 = require("../domain/errors");
const errorHandler = (error, req, res, next) => {
    const timestamp = new Date().toISOString();
    const path = req.originalUrl;
    // Domain Errors (nossa arquitetura)
    if ((0, errors_1.isDomainError)(error)) {
        const errorResponse = {
            error: error.message,
            code: error.errorCode,
            statusCode: error.statusCode,
            details: error.details,
            timestamp,
            path,
        };
        res.status(error.statusCode).json(errorResponse);
        return;
    }
    // Zod Validation Errors
    if (error instanceof zod_1.ZodError) {
        const errorResponse = {
            error: 'Dados inválidos',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
            })),
            timestamp,
            path,
        };
        res.status(400).json(errorResponse);
        return;
    }
    // JWT Errors
    if (error.name === 'JsonWebTokenError') {
        const errorResponse = {
            error: 'Token inválido',
            code: 'INVALID_TOKEN',
            statusCode: 401,
            timestamp,
            path,
        };
        res.status(401).json(errorResponse);
        return;
    }
    if (error.name === 'TokenExpiredError') {
        const errorResponse = {
            error: 'Token expirado',
            code: 'EXPIRED_TOKEN',
            statusCode: 401,
            timestamp,
            path,
        };
        res.status(401).json(errorResponse);
        return;
    }
    // Prisma Errors
    if (error.code === 'P2002') {
        const errorResponse = {
            error: 'Dados já existem no sistema',
            code: 'UNIQUE_CONSTRAINT',
            statusCode: 409,
            details: {
                target: error.meta?.target,
            },
            timestamp,
            path,
        };
        res.status(409).json(errorResponse);
        return;
    }
    if (error.code === 'P2025') {
        const errorResponse = {
            error: 'Registro não encontrado',
            code: 'NOT_FOUND',
            statusCode: 404,
            timestamp,
            path,
        };
        res.status(404).json(errorResponse);
        return;
    }
    // Database Connection Errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.error('Database connection error:', error);
        const errorResponse = {
            error: 'Erro de conexão com o banco de dados',
            code: 'DATABASE_CONNECTION',
            statusCode: 503,
            timestamp,
            path,
        };
        res.status(503).json(errorResponse);
        return;
    }
    // Default/Unknown Errors
    console.error('Unhandled error:', error);
    const errorResponse = {
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor'
            : error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        details: process.env.NODE_ENV === 'production' ? undefined : {
            stack: error.stack,
            name: error.name,
        },
        timestamp,
        path,
    };
    res.status(500).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async error wrapper para controllers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404 Handler
const notFoundHandler = (req, res) => {
    const errorResponse = {
        error: 'Endpoint não encontrado',
        code: 'NOT_FOUND',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    };
    res.status(404).json(errorResponse);
};
exports.notFoundHandler = notFoundHandler;
