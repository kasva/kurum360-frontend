import type { ValidationErrors } from '../../domain/requests/types';

export class RequestValidationError extends Error {
  readonly errors: ValidationErrors;
  constructor(errors: ValidationErrors) {
    super('Lütfen işaretli alanları kontrol edin.');
    this.name = 'RequestValidationError';
    this.errors = errors;
  }
}
