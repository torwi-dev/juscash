"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperExecution = void 0;
class ScraperExecution {
    constructor(id, executionDate, startTime, endTime, status = 'running', publicationsFound = 0, publicationsNew = 0, publicationsDuplicated = 0, errorMessage, djeUrl, hostName, executedBy, environment = 'production', createdAt = new Date()) {
        this.id = id;
        this.executionDate = executionDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.publicationsFound = publicationsFound;
        this.publicationsNew = publicationsNew;
        this.publicationsDuplicated = publicationsDuplicated;
        this.errorMessage = errorMessage;
        this.djeUrl = djeUrl;
        this.hostName = hostName;
        this.executedBy = executedBy;
        this.environment = environment;
        this.createdAt = createdAt;
    }
    static fromPrisma(prismaExecution) {
        return new ScraperExecution(prismaExecution.id, prismaExecution.executionDate, prismaExecution.startTime, prismaExecution.endTime, prismaExecution.status, prismaExecution.publicationsFound, prismaExecution.publicationsNew, prismaExecution.publicationsDuplicated, prismaExecution.errorMessage, prismaExecution.djeUrl, prismaExecution.hostName, prismaExecution.executedBy, prismaExecution.environment, prismaExecution.createdAt);
    }
    complete(publicationsFound, publicationsNew) {
        this.status = 'completed';
        this.endTime = new Date();
        this.publicationsFound = publicationsFound;
        this.publicationsNew = publicationsNew;
        this.publicationsDuplicated = publicationsFound - publicationsNew;
    }
    fail(errorMessage) {
        this.status = 'failed';
        this.endTime = new Date();
        this.errorMessage = errorMessage;
    }
}
exports.ScraperExecution = ScraperExecution;
