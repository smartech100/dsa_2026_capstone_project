import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/connection.js';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';

describe('SQLite repository', () => {
  const directory = mkdtempSync(join(tmpdir(), 'event-ticketing-build5-'));
  const databasePath = join(directory, 'ticketing.sqlite');
  let database = createDatabase(databasePath);

  after(() => {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('persists repository records and enforces the sold capacity check', async () => {
    const repository = createSqliteRepository(database);
    const events = createEventService(repository);
    const bookings = createBookingService(repository, createMockPaymentGateway());

    const event = await events.createEvent('organizer-1', {
      title: 'SQLite Persistence Test',
      city: 'Banjul',
      venue: 'Arch 22 Hall',
      startsAt: '2026-12-05T17:00:00.000Z'
    });
    const tier = await events.addTier('organizer-1', event.id, {
      name: 'General',
      priceCents: 2500,
      capacity: 2
    });
    await events.publishEvent('organizer-1', event.id);
    const booking = await bookings.createBooking('attendee-1', {
      tierId: tier.id,
      quantity: 1
    });
    const paid = await bookings.payBooking('attendee-1', booking.reference);

    assert.equal(paid.status, 'paid');
    assert.ok(paid.paidAt);
    assert.throws(() => {
      database.prepare('UPDATE ticket_tiers SET sold = ? WHERE id = ?')
        .run(3, tier.id);
    });

    database.close();
    database = createDatabase(databasePath);
    const reopenedRepository = createSqliteRepository(database);

    assert.equal((await reopenedRepository.getEvent(event.id)).title, event.title);
    assert.equal((await reopenedRepository.getTier(tier.id)).seatsBooked, 1);
    const persistedBooking = await reopenedRepository.getBookingByReference(booking.reference);
    assert.equal(persistedBooking.status, 'paid');
    assert.equal(persistedBooking.paidAt, paid.paidAt);
  });
});
