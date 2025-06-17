 
// Base Domain Error
export abstract class DomainError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Business Logic Errors
export class InvalidTransitionError extends DomainError {
  readonly statusCode = 422;
  readonly errorCode = 'INVALID_TRANSITION';
}

export class NotFoundError extends DomainError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
}

export class AlreadyExistsError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'ALREADY_EXISTS';
}

export class ValidationError extends DomainError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends DomainError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHORIZED';
}

export class ForbiddenError extends DomainError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
}

export class BusinessRuleError extends DomainError {
  readonly statusCode = 422;
  readonly errorCode = 'BUSINESS_RULE_VIOLATION';
}

// Scraper Specific Errors
export class ScrapingError extends DomainError {
  readonly statusCode = 500;
  readonly errorCode = 'SCRAPING_ERROR';
}

export class ExecutionConflictError extends DomainError {
  readonly statusCode = 409;
  readonly errorCode = 'EXECUTION_CONFLICT';
}