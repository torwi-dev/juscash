/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 🔑 Realizar login
 *     description: Autentica usuário e retorna JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/publications:
 *   get:
 *     summary: 📄 Listar publicações
 *     description: Busca publicações com filtros e paginação
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         description: Termo de busca (processo, autor, advogado)
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filtrar por status
 *         schema:
 *           type: string
 *           enum: [nova, lida, enviada_adv, concluida]
 *       - name: dateFrom
 *         in: query
 *         description: Data inicial (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: dateTo
 *         in: query
 *         description: Data final (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: page
 *         in: query
 *         description: Número da página
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Itens por página (max 100)
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Lista de publicações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Publication'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *   post:
 *     summary: ➕ Criar publicação
 *     description: Cria nova publicação (apenas scraper_service ou admin)
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePublicationRequest'
 *     responses:
 *       201:
 *         description: Publicação criada
 *       409:
 *         description: Publicação já existe
 */
/**
 * @swagger
 * /api/publications/{id}/status:
 *   patch:
 *     summary: 🔄 Atualizar status
 *     description: Move publicação no Kanban (transições válidas apenas)
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID da publicação
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusRequest'
 *     responses:
 *       200:
 *         description: Status atualizado
 *       422:
 *         description: Transição não permitida
 */
/**
 * @swagger
 * /api/scraper/executions:
 *   post:
 *     summary: 🚀 Iniciar execução
 *     description: Cria nova execução de scraping
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [executionDate]
 *             properties:
 *               executionDate:
 *                 type: string
 *                 format: date
 *               djeUrl:
 *                 type: string
 *               hostName:
 *                 type: string
 *               executedBy:
 *                 type: string
 *               environment:
 *                 type: string
 *                 enum: [development, staging, production]
 *     responses:
 *       201:
 *         description: Execução criada
 *       409:
 *         description: Já existe execução para esta data
 */ 
