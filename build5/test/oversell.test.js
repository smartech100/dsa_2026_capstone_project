import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/connection.js';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';

describe('concurrent seat reservations', () => {
  const database = createDatabase(':memory:');

  after(() => database.close());

  it('allows exactly one of 50 simultaneous bookings for the last seat', async () => {
    const repository = createSqliteRepository(database);
    const events = createEventService(repository);
    const bookings = createBookingService(repository, createMockPaymentGateway());

    const event = await events.createEvent('organizer-1', {
      title: 'Oversell Concurrency Test',
      city: 'Banjul',
      venue: 'Arch 22 Hall',
      startsAt: '2026-12-05T17:00:00.000Z'
    });
    const tier = await events.addTier('organizer-1', event.id, {
      name: 'Last Seat',
      priceCents: 2500,
      capacity: 1
    });
    await events.publishEvent('organizer-1', event.id);

    const attempts = await Promise.allSettled(
      Array.from({ length: 50 }, (_, index) =>
        bookings.createBooking(`attendee-${index}`, { tierId: tier.id, quantity: 1 })
      )
    );
    const successes = attempts.filter((result) => result.status === 'fulfilled');
    const soldOut = attempts.filter((result) =>
      result.status === 'rejected' && result.reason?.code === 'SOLD_OUT'
    );

    assert.equal(successes.length, 1);
    assert.equal(soldOut.length, 49);
    assert.equal((await repository.getTier(tier.id)).seatsBooked, 1);
    assert.equal(
      database.prepare('SELECT COUNT(*) AS count FROM bookings WHERE tier_id = ?')
        .get(tier.id).count,
      1
    );
  });
});
