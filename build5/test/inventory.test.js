import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.js';
import {
  createStore,
  createEvent,
  addTier,
  publishEvent,
  unpublishEvent,
  listEventSummaries,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  peekWaitlist
} from '../src/domain/inventory.js';

function draftEvent(store, overrides = {}) {
  return createEvent(store, {
    title: 'Banjul Tech Meetup',
    city: 'Banjul',
    venue: 'Arch 22 Hall',
    startsAt: '2026-12-05T17:00:00.000Z',
    ...overrides
  });
}

function publishedGeneral(store, { capacity = 3, priceCents = 2500 } = {}) {
  const event = draftEvent(store, { capacity });
  const tier = addTier(store, event.id, { name: 'General', priceCents, capacity });
  publishEvent(store, event.id);
  return { event, tier };
}

describe('createEvent', () => {
  it('saves a draft with a new id that is not on the public list', () => {
    const store = createStore();
    const event = draftEvent(store);

    assert.ok(event.id);
    assert.equal(event.status, 'DRAFT');
    assert.equal(event.title, 'Banjul Tech Meetup');
    assert.equal(event.city, 'Banjul');
    assert.equal(event.venue, 'Arch 22 Hall');
    assert.equal(listEventSummaries(store).length, 0);
    assert.equal(listEventSummaries(store, { publishedOnly: false }).length, 1);
  });

  it('rejects missing title with VALIDATION and saves nothing', () => {
    const store = createStore();
    assert.throws(
      () => createEvent(store, {
        city: 'Banjul',
        venue: 'Arch 22 Hall',
        startsAt: '2026-11-15T18:00:00.000Z'
      }),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
    assert.equal(store.events.size, 0);
  });

  it('rejects missing city with VALIDATION and saves nothing', () => {
    const store = createStore();
    assert.throws(
      () => createEvent(store, {
        title: 'Serekunda Jazz Night',
        venue: 'Senegambia Beach Stage',
        startsAt: '2026-11-15T18:00:00.000Z'
      }),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
    assert.equal(store.events.size, 0);
  });

  it('rejects a date that is not a real date with VALIDATION and saves nothing', () => {
    const store = createStore();
    assert.throws(
      () => createEvent(store, {
        title: 'Serekunda Jazz Night',
        city: 'Serekunda',
        venue: 'Senegambia Beach Stage',
        startsAt: 'not-a-real-date'
      }),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
    assert.equal(store.events.size, 0);
  });
});

describe('addTier', () => {
  it('saves General at 500000 bututs with 0 sold and 100 seats left', () => {
    const store = createStore();
    const event = draftEvent(store);
    const tier = addTier(store, event.id, {
      name: 'General',
      priceCents: 500000,
      capacity: 100
    });

    assert.equal(tier.name, 'General');
    assert.equal(tier.priceCents, 500000);
    assert.equal(tier.seatsBooked, 0);
    assert.equal(tier.capacity - tier.seatsBooked, 100);
  });

  it('rejects a non-whole price with VALIDATION', () => {
    const store = createStore();
    const event = draftEvent(store);
    assert.throws(
      () => addTier(store, event.id, { name: 'General', priceCents: 12.5, capacity: 10 }),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
    assert.equal(event.tiers.size, 0);
  });

  it('rejects capacity less than 1 with VALIDATION', () => {
    const store = createStore();
    const event = draftEvent(store);
    assert.throws(
      () => addTier(store, event.id, { name: 'General', priceCents: 1000, capacity: 0 }),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
    assert.equal(event.tiers.size, 0);
  });

  it('rejects a missing event id with NOT_FOUND', () => {
    const store = createStore();
    assert.throws(
      () => addTier(store, 'missing-event-id', { name: 'General', priceCents: 1000, capacity: 10 }),
      (err) => err instanceof DomainError && err.code === 'NOT_FOUND'
    );
  });
});

describe('publishEvent / unpublishEvent / listEventSummaries', () => {
  it('publish: status becomes PUBLISHED and the event is publicly visible', () => {
    const store = createStore();
    const event = draftEvent(store, {
      title: 'Serekunda Jazz Night',
      city: 'Serekunda',
      venue: 'Senegambia Beach Stage'
    });
    addTier(store, event.id, { name: 'General', priceCents: 15000, capacity: 50 });

    publishEvent(store, event.id);

    assert.equal(event.status, 'PUBLISHED');
    const publicList = listEventSummaries(store, { publishedOnly: true });
    assert.equal(publicList.length, 1);
    assert.equal(publicList[0].id, event.id);
    assert.equal(publicList[0].title, 'Serekunda Jazz Night');
  });

  it('unpublish: status returns to draft and the event leaves the public list', () => {
    const store = createStore();
    const { event } = publishedGeneral(store);
    unpublishEvent(store, event.id);
    assert.equal(event.status, 'DRAFT');
    assert.equal(listEventSummaries(store, { publishedOnly: true }).length, 0);
  });

  it('control visibility: an unpublished event is not on public listings', () => {
    const store = createStore();
    const { event } = publishedGeneral(store);
    unpublishEvent(store, event.id);

    const publicList = listEventSummaries(store);
    assert.equal(publicList.find((s) => s.id === event.id), undefined);
    assert.ok(listEventSummaries(store, { publishedOnly: false }).some((s) => s.id === event.id));
  });

  it('publishing with no ticket tiers is INVALID_STATE', () => {
    const store = createStore();
    const event = draftEvent(store);
    assert.throws(
      () => publishEvent(store, event.id),
      (err) => err instanceof DomainError && err.code === 'INVALID_STATE'
    );
    assert.equal(event.status, 'DRAFT');
  });
});

describe('bookTickets', () => {
  it('books 2 of 3 seats as PENDING, priced in whole bututs, leaving 1 seat', () => {
    const store = createStore();
    const { event, tier } = publishedGeneral(store, { capacity: 3, priceCents: 2500 });

    const booking = bookTickets(store, {
      eventId: event.id,
      tierId: tier.id,
      attendeeName: 'Ada Jallow',
      quantity: 2
    });

    assert.equal(booking.status, 'PENDING');
    assert.equal(booking.quantity, 2);
    assert.equal(booking.unitPriceCents, 2500);
    assert.equal(booking.totalPriceCents, 5000);
    assert.ok(Number.isSafeInteger(booking.totalPriceCents));
    assert.equal(tier.capacity - tier.seatsBooked, 1);
  });

  it('rejects booking 2 when 1 seat is left with SOLD_OUT and changes nothing', () => {
    const store = createStore();
    const { event, tier } = publishedGeneral(store, { capacity: 3, priceCents: 2500 });
    bookTickets(store, {
      eventId: event.id,
      tierId: tier.id,
      attendeeName: 'Ada Jallow',
      quantity: 2
    });

    const seatsBefore = tier.seatsBooked;
    const bookingsBefore = store.bookings.size;

    assert.throws(
      () => bookTickets(store, {
        eventId: event.id,
        tierId: tier.id,
        attendeeName: 'Bayo Ceesay',
        quantity: 2
      }),
      (err) => err instanceof DomainError && err.code === 'SOLD_OUT'
    );

    assert.equal(tier.seatsBooked, seatsBefore);
    assert.equal(store.bookings.size, bookingsBefore);
  });

  it('rejects quantity 0, negative, fractional, or more than 10 with VALIDATION', () => {
    const store = createStore();
    const { event, tier } = publishedGeneral(store, { capacity: 20 });

    for (const quantity of [0, -1, 1.5, 11]) {
      assert.throws(
        () => bookTickets(store, {
          eventId: event.id,
          tierId: tier.id,
          attendeeName: 'Fatou',
          quantity
        }),
        (err) => err instanceof DomainError && err.code === 'VALIDATION'
      );
    }
  });

  it('finds a booking by reference and frees seats on cancel for the waitlist', () => {
    const store = createStore();
    const { event, tier } = publishedGeneral(store, { capacity: 3 });
    const booking = bookTickets(store, {
      eventId: event.id,
      tierId: tier.id,
      attendeeName: 'Ada',
      quantity: 2
    });
    joinWaitlist(store, {
      eventId: event.id,
      tierId: tier.id,
      attendeeName: 'Bayo',
      quantity: 1
    });

    assert.equal(findBookingByReference(store, booking.reference).attendeeName, 'Ada');
    cancelBooking(store, booking.id);
    assert.equal(tier.capacity - tier.seatsBooked, 3);
    assert.equal(peekWaitlist(store, event.id, tier.id).attendeeName, 'Bayo');
  });
});
