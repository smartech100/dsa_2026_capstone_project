/** An error representing an expected failure in the ticketing domain. */
export class DomainError extends Error {
  constructor(code, message) {
    if (typeof code !== 'string' || code.trim() === '') {
      throw new TypeError('DomainError code must be a non-empty string');
    }
    if (typeof message !== 'string' || message.trim() === '') {
      throw new TypeError('DomainError message must be a non-empty string');
    }

    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function assertValid(condition, message) {
  if (!condition) throw new DomainError('VALIDATION', message);
}
