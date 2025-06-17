"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'JusCash DJE API',
            version: '1.0.0',
            description: `
## 🏛️ Sistema de Automação DJE São Paulo

API RESTful para gerenciamento de publicações do Diário da Justiça Eletrônico com arquitetura Clean Architecture.

### ✨ Funcionalidades
- 🔐 **Autenticação JWT** com controle de roles
- 📄 **Gerenciamento de Publicações** com sistema Kanban
- 🤖 **Controle de Execuções de Scraping**
- 🔍 **Busca e Filtros** avançados
- 📊 **Estatísticas** em tempo real

### 🏗️ Arquitetura
- **Clean Architecture** com Repository Pattern
- **Domain-Driven Design** 
- **SOLID Principles**
- **Domain Errors** customizados
- **Dependency Injection** container

### 🚀 Deploy
- **Docker** containerizado
- **PostgreSQL** database
- **Azure/AWS** ready

---
      `,
            contact: {
                name: 'JusCash Development Team',
                email: 'dev@juscash.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: process.env.API_BASE_URL || 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://juscash-dje-api.azurewebsites.net',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header usando Bearer scheme. Exemplo: "Authorization: Bearer {token}"',
                },
            },
            schemas: {
                // Error Responses
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Mensagem de erro legível',
                            example: 'Publicação não encontrada',
                        },
                        code: {
                            type: 'string',
                            description: 'Código do erro para identificação programática',
                            example: 'NOT_FOUND',
                        },
                        statusCode: {
                            type: 'integer',
                            description: 'Código HTTP do status',
                            example: 404,
                        },
                        details: {
                            type: 'object',
                            description: 'Detalhes adicionais do erro',
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Timestamp do erro',
                        },
                        path: {
                            type: 'string',
                            description: 'Endpoint onde ocorreu o erro',
                            example: '/api/publications/123',
                        },
                    },
                },
                // Publication Schemas
                Publication: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'ID único da publicação',
                            example: 1,
                        },
                        processNumber: {
                            type: 'string',
                            description: 'Número do processo judicial',
                            example: '5018120-21.2021.8.13.0022',
                        },
                        publicationDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Data de publicação no DJE',
                            nullable: true,
                        },
                        availabilityDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Data de disponibilização',
                            nullable: true,
                        },
                        authors: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Lista de autores do processo',
                            example: ['João Silva', 'Maria Santos'],
                        },
                        lawyers: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Lista de advogados',
                            example: ['Dr. Carlos Oliveira (OAB 123456)'],
                        },
                        defendant: {
                            type: 'string',
                            description: 'Réu do processo',
                            example: 'Instituto Nacional do Seguro Social - INSS',
                            default: 'Instituto Nacional do Seguro Social - INSS',
                        },
                        mainValue: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Valor principal bruto/líquido',
                            nullable: true,
                            example: 1500.00,
                        },
                        interestValue: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Valor dos juros moratórios',
                            nullable: true,
                            example: 150.00,
                        },
                        legalFees: {
                            type: 'number',
                            format: 'decimal',
                            description: 'Honorários advocatícios',
                            nullable: true,
                            example: 300.00,
                        },
                        fullContent: {
                            type: 'string',
                            description: 'Conteúdo completo da publicação',
                            nullable: true,
                        },
                        status: {
                            type: 'string',
                            enum: ['nova', 'lida', 'enviada_adv', 'concluida'],
                            description: 'Status atual da publicação no fluxo Kanban',
                            example: 'nova',
                        },
                        contentHash: {
                            type: 'string',
                            description: 'Hash MD5 do conteúdo para detecção de duplicatas',
                            nullable: true,
                        },
                        sourceUrl: {
                            type: 'string',
                            description: 'URL onde a publicação foi encontrada',
                            nullable: true,
                        },
                        scraperExecutionId: {
                            type: 'integer',
                            description: 'ID da execução do scraper que encontrou esta publicação',
                            nullable: true,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Data de criação no sistema',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Data da última atualização',
                        },
                    },
                },
                CreatePublicationRequest: {
                    type: 'object',
                    required: ['processNumber', 'authors', 'lawyers'],
                    properties: {
                        processNumber: {
                            type: 'string',
                            description: 'Número único do processo',
                            example: '5018120-21.2021.8.13.0022',
                        },
                        publicationDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Data de publicação no DJE',
                        },
                        availabilityDate: {
                            type: 'string',
                            format: 'date',
                            description: 'Data de disponibilização',
                        },
                        authors: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            minItems: 1,
                            description: 'Lista de autores (obrigatório)',
                        },
                        lawyers: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Lista de advogados',
                        },
                        mainValue: {
                            type: 'number',
                            format: 'decimal',
                            minimum: 0,
                            description: 'Valor principal',
                        },
                        interestValue: {
                            type: 'number',
                            format: 'decimal',
                            minimum: 0,
                            description: 'Juros moratórios',
                        },
                        legalFees: {
                            type: 'number',
                            format: 'decimal',
                            minimum: 0,
                            description: 'Honorários',
                        },
                        fullContent: {
                            type: 'string',
                            description: 'Conteúdo completo',
                        },
                        sourceUrl: {
                            type: 'string',
                            format: 'uri',
                            description: 'URL de origem',
                        },
                        scraperExecutionId: {
                            type: 'integer',
                            description: 'ID da execução',
                        },
                    },
                },
                UpdateStatusRequest: {
                    type: 'object',
                    required: ['status'],
                    properties: {
                        status: {
                            type: 'string',
                            enum: ['nova', 'lida', 'enviada_adv', 'concluida'],
                            description: 'Novo status da publicação',
                        },
                    },
                },
                // User Schemas
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'ID único do usuário',
                        },
                        name: {
                            type: 'string',
                            description: 'Nome completo',
                            example: 'João Silva',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email único',
                            example: 'joao@juscash.com',
                        },
                        role: {
                            type: 'string',
                            enum: ['admin', 'operador', 'scraper_service', 'readonly'],
                            description: 'Papel do usuário no sistema',
                        },
                        isActive: {
                            type: 'boolean',
                            description: 'Status ativo/inativo',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email do usuário',
                            example: 'admin@juscash.com',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            description: 'Senha do usuário',
                            example: 'MinhaSenh@123',
                        },
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                        name: {
                            type: 'string',
                            minLength: 2,
                            maxLength: 100,
                            description: 'Nome completo',
                            example: 'João Silva',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email único',
                            example: 'joao@juscash.com',
                        },
                        password: {
                            type: 'string',
                            minLength: 8,
                            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$',
                            description: 'Senha forte (8+ chars, maiúscula, minúscula, número, especial)',
                            example: 'MinhaSenh@123',
                        },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Login realizado com sucesso',
                        },
                        user: {
                            $ref: '#/components/schemas/User',
                        },
                        token: {
                            type: 'string',
                            description: 'JWT Token para autenticação',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                    },
                },
                // Scraper Schemas
                ScraperExecution: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                        },
                        executionDate: {
                            type: 'string',
                            format: 'date',
                        },
                        startTime: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        endTime: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        status: {
                            type: 'string',
                            enum: ['running', 'completed', 'failed', 'partial', 'timeout', 'maintenance'],
                        },
                        publicationsFound: {
                            type: 'integer',
                            minimum: 0,
                        },
                        publicationsNew: {
                            type: 'integer',
                            minimum: 0,
                        },
                        publicationsDuplicated: {
                            type: 'integer',
                            minimum: 0,
                        },
                        errorMessage: {
                            type: 'string',
                            nullable: true,
                        },
                        djeUrl: {
                            type: 'string',
                            nullable: true,
                        },
                        hostName: {
                            type: 'string',
                            nullable: true,
                        },
                        executedBy: {
                            type: 'string',
                            nullable: true,
                        },
                        environment: {
                            type: 'string',
                            enum: ['development', 'staging', 'production'],
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                // Pagination
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            description: 'Página atual',
                            example: 1,
                        },
                        limit: {
                            type: 'integer',
                            description: 'Itens por página',
                            example: 30,
                        },
                        total: {
                            type: 'integer',
                            description: 'Total de itens',
                            example: 150,
                        },
                        pages: {
                            type: 'integer',
                            description: 'Total de páginas',
                            example: 5,
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Authentication',
                description: '🔐 Operações de autenticação e autorização',
            },
            {
                name: 'Publications',
                description: '📄 Gerenciamento de publicações do DJE',
            },
            {
                name: 'Scraper',
                description: '🤖 Controle de execuções do scraper',
            },
            {
                name: 'Health',
                description: '💚 Status e saúde da API',
            },
        ],
    },
    apis: [
        './src/routes/api/*.ts',
        './src/controllers/*.ts',
        './src/docs/examples.ts',
    ],
};
const specs = (0, swagger_jsdoc_1.default)(options);
const setupSwagger = (app) => {
    // Swagger UI
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
        explorer: true,
        customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 50px 0; }
      .swagger-ui .info .title { color: #3b82f6; }
    `,
        customSiteTitle: 'JusCash DJE API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showExtensions: true,
            tryItOutEnabled: true,
        },
    }));
    // JSON endpoint
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
};
exports.setupSwagger = setupSwagger;
exports.default = specs;
