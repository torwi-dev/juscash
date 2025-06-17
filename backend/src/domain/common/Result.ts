import { DomainError } from "../errors/DomainErrors";

 


export type Result<T, E = DomainError> = Success<T> | Failure<E>;

export class Success<T> {
  readonly isSuccess = true;
  readonly isFailure = false;

  constructor(public readonly value: T) {}

  static create<T>(value: T): Success<T> {
    return new Success(value);
  }
}

export class Failure<E> {
  readonly isSuccess = false;
  readonly isFailure = true;

  constructor(public readonly error: E) {}

  static create<E>(error: E): Failure<E> {
    return new Failure(error);
  }
}

// Helper functions
export const success = <T>(value: T): Success<T> => Success.create(value);
export const failure = <E>(error: E): Failure<E> => Failure.create(error);

// Result utilities
export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> => {
  return result.isSuccess;
};

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> => {
  return result.isFailure;
};

// Async Result type
export type AsyncResult<T, E = DomainError> = Promise<Result<T, E>>;