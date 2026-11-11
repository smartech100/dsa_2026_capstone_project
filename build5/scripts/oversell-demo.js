import { createDatabase } from '../src/db/connection.js';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';

const database = createDatabase(':memory:');

try {
  const repository = createSqliteRepository(database);
  const events = createEventService(repository);
  const bookings = createBookingService(repository, createMockPaymentGateway());

  const event = await events.createEvent('demo-organizer', {
    title: 'Last Seat Race',
    city: 'Banjul',
    venue: 'Arch 22 Hall',
    startsAt: '2026-12-05T17:00:00.000Z'
  });
  const tier = await events.addTier('demo-organizer', event.id, {
    name: 'General Admission',
    priceCents: 2500,
    capacity: 50
  });
  await events.publishEvent('demo-organizer', event.id);

  for (let seat = 0; seat < 49; seat += 1) {
    await bookings.createBooking(`existing-attendee-${seat}`, {
      tierId: tier.id,
      quantity: 1
    });
  }
  console.log('Seats left before the race: 1');

  const attempts = await Promise.allSettled(
    Array.from({ length: 50 }, (_, index) =>
      bookings.createBooking(`racer-${index + 1}`, { tierId: tier.id, quantity: 1 })
    )
  );
  const successes = attempts.filter((result) => result.status === 'fulfilled').length;
  const soldOut = attempts.filter((result) =>
    result.status === 'rejected' && result.reason?.code === 'SOLD_OUT'
  ).length;
  const bookingSales = database.prepare(
    'SELECT COALESCE(SUM(quantity), 0) AS sold FROM bookings WHERE tier_id = ?'
  ).get(tier.id).sold;
  const storedTier = await repository.getTier(tier.id);

  console.log(`Booking requests: ${attempts.length}`);
  console.log(`Bookings succeeded: ${successes}`);
  console.log(`Bookings rejected as SOLD_OUT: ${soldOut}`);
  console.log(`Seats sold according to bookings: ${bookingSales}`);
  console.log(`Seats recorded in SQLite ticket tier: ${storedTier.seatsBooked}`);
} finally {
  database.close();
}
