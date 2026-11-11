import { DomainError, assertValid } from '../domain/errors.js';
import { assertTransition } from '../domain/bookingStateMachine.js';
import { newId, newReference } from '../domain/ids.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function requireOwner(booking, userId) {
  if (booking.userId !== userId) {
    throw new DomainError('FORBIDDEN', 'Only the attendee who made this booking can change it');
  }
}

export function createBookingService(repository, paymentGateway) {
  assertValid(repository && typeof repository.getEvent === 'function'
    && typeof repository.getTier === 'function'
    && typeof repository.saveTier === 'function'
    && typeof repository.reserveTierSeats === 'function'
    && typeof repository.saveBooking === 'function'
    && typeof repository.getBookingByReference === 'function',
  'A booking repository is required');
  assertValid(paymentGateway && typeof paymentGateway.charge === 'function',
    'A payment gateway is required');

  return {
    async createBooking(userId, input) {
      assertValid(isNonEmptyString(userId), 'x-user-id must be a non-empty string');
      assertValid(input !== null && typeof input === 'object' && !Array.isArray(input),
        'Booking details must be a JSON object');
      const { tierId, quantity } = input;
      assertValid(isNonEmptyString(tierId), 'tierId must be a non-empty string');
      assertValid(Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 10,
        'Booking quantity must be an integer from 1 to 10');

      const tier = await repository.getTier(tierId);
      if (!tier) throw new DomainError('NOT_FOUND', `Ticket tier not found: ${tierId}`);
      const event = await repository.getEvent(tier.eventId);
      if (!event) throw new DomainError('NOT_FOUND', `Event not found: ${tier.eventId}`);
      if (event.status !== 'PUBLISHED') {
        throw new DomainError('INVALID_STATE', 'Tickets can only be booked for published events');
      }
      const totalPriceCents = tier.priceCents * quantity;
      assertValid(Number.isSafeInteger(totalPriceCents), 'Booking total must be a whole number of cents');
      const booking = {
        id: newId(),
        reference: newReference(),
        userId,
        eventId: event.id,
        tierId,
        quantity,
        unitPriceCents: tier.priceCents,
        totalPriceCents,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const reserved = await repository.reserveTierSeats(tierId, quantity);
      if (!reserved) {
        throw new DomainError('SOLD_OUT', `Not enough tickets remain in tier ${tier.name}`);
      }
      return repository.saveBooking(booking);
    },

    async payBooking(userId, reference, { decline = false } = {}) {
      assertValid(isNonEmptyString(userId), 'x-user-id must be a non-empty string');
      assertValid(isNonEmptyString(reference), 'Booking reference must be a non-empty string');
      assertValid(typeof decline === 'boolean', 'decline must be a boolean');
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', `Booking not found: ${reference}`);
      requireOwner(booking, userId);
      assertTransition(booking.status, 'paid');

      const result = await paymentGateway.charge({
        amountCents: booking.totalPriceCents,
        shouldDecline: decline
      });
      if (!result || (result.status !== 'success' && result.status !== 'declined')) {
        throw new Error('Payment gateway returned an invalid result');
      }
      if (result.status === 'declined') {
        throw new DomainError('PAYMENT_DECLINED', 'Payment was declined');
      }

      booking.status = 'paid';
      booking.paidAt = new Date().toISOString();
      return repository.saveBooking(booking);
    },

    async cancelBooking(userId, reference) {
      assertValid(isNonEmptyString(userId), 'x-user-id must be a non-empty string');
      assertValid(isNonEmptyString(reference), 'Booking reference must be a non-empty string');
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', `Booking not found: ${reference}`);
      requireOwner(booking, userId);
      if (booking.status !== 'pending') {
        throw new DomainError('INVALID_TRANSITION', 'Only pending bookings can be cancelled');
      }
      assertTransition(booking.status, 'cancelled');

      const tier = await repository.getTier(booking.tierId);
      if (!tier) throw new DomainError('NOT_FOUND', `Ticket tier not found: ${booking.tierId}`);
      tier.seatsBooked -= booking.quantity;
      booking.status = 'cancelled';
      booking.cancelledAt = new Date().toISOString();
      await repository.saveTier(tier);
      return repository.saveBooking(booking);
    }
  };
}
