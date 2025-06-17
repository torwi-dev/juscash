"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionConflictError = exports.ScrapingError = exports.BusinessRuleError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.AlreadyExistsError = exports.NotFoundError = exports.InvalidTransitionError = exports.DomainError = void 0;
// Base Domain Error
class DomainError extends Error {
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.DomainError = DomainError;
// Business Logic Errors
class InvalidTransitionError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 422;
        this.errorCode = 'INVALID_TRANSITION';
    }
}
exports.InvalidTransitionError = InvalidTransitionError;
class NotFoundError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 404;
        this.errorCode = 'NOT_FOUND';
    }
}
exports.NotFoundError = NotFoundError;
class AlreadyExistsError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 409;
        this.errorCode = 'ALREADY_EXISTS';
    }
}
exports.AlreadyExistsError = AlreadyExistsError;
class ValidationError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 400;
        this.errorCode = 'VALIDATION_ERROR';
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 401;
        this.errorCode = 'UNAUTHORIZED';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 403;
        this.errorCode = 'FORBIDDEN';
    }
}
exports.ForbiddenError = ForbiddenError;
class BusinessRuleError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 422;
        this.errorCode = 'BUSINESS_RULE_VIOLATION';
    }
}
exports.BusinessRuleError = BusinessRuleError;
// Scraper Specific Errors
class ScrapingError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 500;
        this.errorCode = 'SCRAPING_ERROR';
    }
}
exports.ScrapingError = ScrapingError;
class ExecutionConflictError extends DomainError {
    constructor() {
        super(...arguments);
        this.statusCode = 409;
        this.errorCode = 'EXECUTION_CONFLICT';
    }
}
exports.ExecutionConflictError = ExecutionConflictError;
