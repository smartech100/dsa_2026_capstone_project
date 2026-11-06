import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.js';
import {
  assertTransition,
  BOOKING_STATES,
  BOOKING_TRANSITIONS,
  canTransition
} from '../src/domain/bookingStateMachine.js';

describe('booking state machine', () => {
  it('exposes the booking states and allowed transitions as data', () => {
    assert.deepEqual(BOOKING_STATES, ['pending', 'paid', 'cancelled', 'refunded', 'checked_in']);
    assert.deepEqual(BOOKING_TRANSITIONS, {
      pending: ['paid', 'cancelled'],
      paid: ['checked_in', 'refunded', 'cancelled'],
      cancelled: [],
      refunded: [],
      checked_in: []
    });
  });

  it('accepts every allowed transition and rejects every other state pair', () => {
    for (const from of BOOKING_STATES) {
      for (const to of BOOKING_STATES) {
        const allowed = BOOKING_TRANSITIONS[from].includes(to);
        assert.equal(canTransition(from, to), allowed, `${from} -> ${to}`);
        if (allowed) {
          assert.doesNotThrow(() => assertTransition(from, to), `${from} -> ${to}`);
        } else {
          assert.throws(
            () => assertTransition(from, to),
            (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION',
            `${from} -> ${to}`
          );
        }
      }
    }
  });

  it('rejects unknown states', () => {
    assert.equal(canTransition('unknown', 'paid'), false);
    assert.throws(
      () => assertTransition('pending', 'unknown'),
      (error) => error instanceof DomainError && error.code === 'INVALID_TRANSITION'
    );
  });
});
