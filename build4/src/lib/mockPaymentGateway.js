import { newId } from '../domain/ids.js';

export function createMockPaymentGateway() {
  return {
    async charge({ amountCents, shouldDecline = false } = {}) {
      if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
        throw new TypeError('amountCents must be a non-negative whole number');
      }
      if (typeof shouldDecline !== 'boolean') {
        throw new TypeError('shouldDecline must be a boolean');
      }
      if (shouldDecline) return { status: 'declined' };
      return { status: 'success', transactionId: newId() };
    }
  };
}
