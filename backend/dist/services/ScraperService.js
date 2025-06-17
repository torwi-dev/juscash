"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const DomainErrors_1 = require("../domain/errors/DomainErrors");
class ScraperService {
    constructor(scraperRepository) {
        this.scraperRepository = scraperRepository;
    }
    async createExecution(data) {
        // Validações de entrada
        if (!data.executionDate) {
            throw new DomainErrors_1.ValidationError('Data de execução é obrigatória');
        }
        if (!(data.executionDate instanceof Date)) {
            throw new DomainErrors_1.ValidationError('Data de execução deve ser um objeto Date válido');
        }
        // Validar data (não pode ser futura além de hoje)
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (data.executionDate > today) {
            throw new DomainErrors_1.ValidationError('Data de execução não pode ser futura');
        }
        // Validar data muito antiga (máximo 90 dias)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 180);
        if (data.executionDate < ninetyDaysAgo) {
            throw new DomainErrors_1.BusinessRuleError('Não é possível criar execução para data superior a 180 dias atrás');
        }
        // Validações opcionais
        if (data.djeUrl && !this.isValidUrl(data.djeUrl)) {
            throw new DomainErrors_1.ValidationError('URL do DJE inválida');
        }
        if (data.hostName && data.hostName.length > 255) {
            throw new DomainErrors_1.ValidationError('Nome do host deve ter no máximo 255 caracteres');
        }
        if (data.executedBy && data.executedBy.length > 100) {
            throw new DomainErrors_1.ValidationError('Campo "executedBy" deve ter no máximo 100 caracteres');
        }
        if (data.environment && !['development', 'staging', 'production'].includes(data.environment)) {
            throw new DomainErrors_1.ValidationError('Environment deve ser: development, staging ou production');
        }
        // Verificar se já existe execução para esta data
        const existingExecution = await this.scraperRepository.existsByDate(data.executionDate);
        if (existingExecution) {
            throw new DomainErrors_1.ExecutionConflictError(`Já existe execução para a data: ${data.executionDate.toISOString().split('T')[0]}`);
        }
        // Verificar se não há execução em andamento
        const runningExecution = await this.getRunningExecution();
        if (runningExecution) {
            throw new DomainErrors_1.ExecutionConflictError(`Já existe execução em andamento (ID: ${runningExecution.id})`);
        }
        return await this.scraperRepository.create({
            ...data,
            environment: data.environment || 'production',
        });
    }
    async updateExecution(id, data) {
        if (!id || id < 1) {
            throw new DomainErrors_1.ValidationError('ID de execução inválido');
        }
        // Verificar se execução existe
        const existingExecution = await this.scraperRepository.findById(id);
        if (!existingExecution) {
            throw new DomainErrors_1.NotFoundError('Execução não encontrada');
        }
        // Validações de transição de status
        if (existingExecution.status === 'completed' && data.status !== 'completed') {
            throw new DomainErrors_1.BusinessRuleError('Execução concluída não pode ter status alterado');
        }
        if (existingExecution.status === 'failed' && data.status === 'running') {
            throw new DomainErrors_1.BusinessRuleError('Execução falhada não pode voltar para "running"');
        }
        // Validações específicas por status
        if (data.status === 'completed') {
            if (data.publicationsFound === undefined || data.publicationsNew === undefined) {
                throw new DomainErrors_1.ValidationError('Publicações encontradas e novas são obrigatórias para status "completed"');
            }
            if (data.publicationsFound < 0 || data.publicationsNew < 0) {
                throw new DomainErrors_1.ValidationError('Número de publicações não pode ser negativo');
            }
            if (data.publicationsFound < data.publicationsNew) {
                throw new DomainErrors_1.BusinessRuleError('Publicações novas não pode ser maior que publicações encontradas');
            }
            // Calcular duplicadas automaticamente
            data.publicationsDuplicated = data.publicationsFound - data.publicationsNew;
        }
        if (data.status === 'failed') {
            if (!data.errorMessage?.trim()) {
                throw new DomainErrors_1.ValidationError('Mensagem de erro é obrigatória para status "failed"');
            }
            if (data.errorMessage.length > 1000) {
                throw new DomainErrors_1.ValidationError('Mensagem de erro deve ter no máximo 1000 caracteres');
            }
        }
        // Validações de valores
        if (data.publicationsFound !== undefined && data.publicationsFound < 0) {
            throw new DomainErrors_1.ValidationError('Publicações encontradas não pode ser negativo');
        }
        if (data.publicationsNew !== undefined && data.publicationsNew < 0) {
            throw new DomainErrors_1.ValidationError('Publicações novas não pode ser negativo');
        }
        if (data.publicationsDuplicated !== undefined && data.publicationsDuplicated < 0) {
            throw new DomainErrors_1.ValidationError('Publicações duplicadas não pode ser negativo');
        }
        // Validar tempo de execução
        if (data.endTime && existingExecution.startTime && data.endTime < existingExecution.startTime) {
            throw new DomainErrors_1.BusinessRuleError('Data de fim não pode ser anterior ao início da execução');
        }
        return await this.scraperRepository.update(id, data);
    }
    async getExecutions(pagination = { page: 1, limit: 20 }) {
        if (pagination.page < 1) {
            throw new DomainErrors_1.ValidationError('Página deve ser maior que 0');
        }
        if (pagination.limit < 1 || pagination.limit > 100) {
            throw new DomainErrors_1.ValidationError('Limite deve estar entre 1 e 100');
        }
        return await this.scraperRepository.findAll(pagination);
    }
    async getExecutionById(id) {
        if (!id || id < 1) {
            throw new DomainErrors_1.ValidationError('ID de execução inválido');
        }
        const execution = await this.scraperRepository.findById(id);
        if (!execution) {
            throw new DomainErrors_1.NotFoundError('Execução não encontrada');
        }
        return execution;
    }
    async getExecutionByDate(date) {
        if (!date || !(date instanceof Date)) {
            throw new DomainErrors_1.ValidationError('Data inválida');
        }
        return await this.scraperRepository.findByDate(date);
    }
    async getExecutionStats() {
        return await this.scraperRepository.getStats();
    }
    async completeExecution(id, publicationsFound, publicationsNew) {
        if (!id || id < 1) {
            throw new DomainErrors_1.ValidationError('ID de execução inválido');
        }
        if (publicationsFound < 0) {
            throw new DomainErrors_1.ValidationError('Publicações encontradas não pode ser negativo');
        }
        if (publicationsNew < 0) {
            throw new DomainErrors_1.ValidationError('Publicações novas não pode ser negativo');
        }
        if (publicationsFound < publicationsNew) {
            throw new DomainErrors_1.BusinessRuleError('Publicações novas não pode ser maior que publicações encontradas');
        }
        const execution = await this.getExecutionById(id);
        if (execution.status === 'completed') {
            throw new DomainErrors_1.BusinessRuleError('Execução já está concluída');
        }
        if (execution.status === 'failed') {
            throw new DomainErrors_1.BusinessRuleError('Execução falhada não pode ser concluída');
        }
        // Usar método de domínio
        execution.complete(publicationsFound, publicationsNew);
        return await this.scraperRepository.update(id, {
            status: execution.status,
            endTime: execution.endTime,
            publicationsFound: execution.publicationsFound,
            publicationsNew: execution.publicationsNew,
            publicationsDuplicated: execution.publicationsDuplicated,
        });
    }
    async failExecution(id, errorMessage) {
        if (!id || id < 1) {
            throw new DomainErrors_1.ValidationError('ID de execução inválido');
        }
        if (!errorMessage?.trim()) {
            throw new DomainErrors_1.ValidationError('Mensagem de erro é obrigatória');
        }
        if (errorMessage.length > 1000) {
            throw new DomainErrors_1.ValidationError('Mensagem de erro deve ter no máximo 1000 caracteres');
        }
        const execution = await this.getExecutionById(id);
        if (execution.status === 'completed') {
            throw new DomainErrors_1.BusinessRuleError('Execução concluída não pode ser marcada como falhada');
        }
        // Usar método de domínio
        execution.fail(errorMessage.trim());
        return await this.scraperRepository.update(id, {
            status: execution.status,
            endTime: execution.endTime,
            errorMessage: execution.errorMessage,
        });
    }
    async getTodayExecution() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return await this.scraperRepository.findByDate(today);
    }
    async getRunningExecution() {
        const executions = await this.scraperRepository.findAll({ page: 1, limit: 10 });
        return executions.data.find(exec => exec.status === 'running') || null;
    }
    async cancelExecution(id, reason) {
        if (!reason?.trim()) {
            throw new DomainErrors_1.ValidationError('Motivo do cancelamento é obrigatório');
        }
        return await this.failExecution(id, `Cancelado: ${reason.trim()}`);
    }
    isValidUrl(url) {
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        }
        catch {
            return false;
        }
    }
}
exports.ScraperService = ScraperService;
