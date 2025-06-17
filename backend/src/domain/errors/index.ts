import { DomainError, NotFoundError, ValidationError } from './DomainErrors';

// Error type guards
export const isDomainError = (error: any): error is DomainError => {
  return error instanceof DomainError;
};

export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isNotFoundError = (error: any): error is NotFoundError => {
  return error instanceof NotFoundError;
};