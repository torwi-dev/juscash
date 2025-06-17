"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Publication = void 0;
class Publication {
    constructor(id, processNumber, publicationDate, availabilityDate, authors = [], lawyers = [], defendant = 'Instituto Nacional do Seguro Social - INSS', mainValue, interestValue, legalFees, fullContent, status = 'nova', contentHash, sourceUrl, scraperExecutionId, createdAt = new Date(), updatedAt = new Date()) {
        this.id = id;
        this.processNumber = processNumber;
        this.publicationDate = publicationDate;
        this.availabilityDate = availabilityDate;
        this.authors = authors;
        this.lawyers = lawyers;
        this.defendant = defendant;
        this.mainValue = mainValue;
        this.interestValue = interestValue;
        this.legalFees = legalFees;
        this.fullContent = fullContent;
        this.status = status;
        this.contentHash = contentHash;
        this.sourceUrl = sourceUrl;
        this.scraperExecutionId = scraperExecutionId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    // Business logic methods
    canMoveTo(newStatus) {
        const allowedTransitions = {
            nova: ['lida'],
            lida: ['enviada_adv'],
            enviada_adv: ['lida', 'concluida'],
            concluida: [],
        };
        return allowedTransitions[this.status].includes(newStatus);
    }
    moveTo(newStatus) {
        if (!this.canMoveTo(newStatus)) {
            throw new Error(`Transição de '${this.status}' para '${newStatus}' não permitida`);
        }
        this.status = newStatus;
        this.updatedAt = new Date();
    }
    static fromPrisma(prismaPublication) {
        return new Publication(prismaPublication.id, prismaPublication.processNumber, prismaPublication.publicationDate, prismaPublication.availabilityDate, prismaPublication.authors, prismaPublication.lawyers, prismaPublication.defendant, prismaPublication.mainValue ? Number(prismaPublication.mainValue) : undefined, prismaPublication.interestValue ? Number(prismaPublication.interestValue) : undefined, prismaPublication.legalFees ? Number(prismaPublication.legalFees) : undefined, prismaPublication.fullContent, prismaPublication.status, prismaPublication.contentHash, prismaPublication.sourceUrl, prismaPublication.scraperExecutionId, prismaPublication.createdAt, prismaPublication.updatedAt);
    }
}
exports.Publication = Publication;
