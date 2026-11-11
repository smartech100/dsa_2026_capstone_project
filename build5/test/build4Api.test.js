import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/http/app.js';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';

let server;
let baseUrl;
const chargeRequests = [];
const mockGateway = createMockPaymentGateway();
const paymentGateway = {
  async charge(request) {
    chargeRequests.push(request);
    return mockGateway.charge(request);
  }
};

async function call(path, { method = 'GET', userId, body } = {}) {
  const headers = {};
  if (userId !== undefined) headers['x-user-id'] = userId;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function createPublishedEvent({
  title = 'Banjul Tech Meetup',
  city = 'Banjul',
  startsAt = '2026-12-05T17:00:00.000Z',
  priceCents = 2500,
  capacity = 3
} = {}) {
  const created = await call('/api/events', {
    method: 'POST',
    userId: 'organizer-1',
    body: { title, city, venue: 'Arch 22 Hall', startsAt }
  });
  const event = created.body.event;
  const added = await call(`/api/events/${event.id}/tiers`, {
    method: 'POST',
    userId: 'organizer-1',
    body: { name: 'General', priceCents, capacity }
  });
  const published = await call(`/api/events/${event.id}/publish`, {
    method: 'POST',
    userId: 'organizer-1'
  });
  assert.equal(added.status, 201);
  assert.equal(published.status, 200);
  return { event, tier: added.body.tier };
}

describe('Build 4 REST API', () => {
  before(async () => {
    chargeRequests.length = 0;
    server = createApp({ paymentGateway });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  it('creates draft events, validates required fields, and hides drafts', async () => {
    const response = await call('/api/events', {
      method: 'POST',
      userId: 'organizer-1',
      body: {
        title: 'Serekunda Jazz Night',
        city: 'Serekunda',
        venue: 'Senegambia Beach Stage',
        startsAt: '2026-11-15T18:00:00.000Z'
      }
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.event.status, 'DRAFT');
    assert.ok(response.body.event.id);

    const invalid = await call('/api/events', {
      method: 'POST',
      userId: 'organizer-1',
      body: { title: 'Missing city', venue: 'Hall', startsAt: '2026-11-15' }
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'VALIDATION');
    for (const body of [
      { city: 'City', venue: 'Hall', startsAt: '2026-11-15' },
      { title: 'Bad date', city: 'City', venue: 'Hall', startsAt: '2026-02-30T12:00:00Z' }
    ]) {
      const rejected = await call('/api/events', { method: 'POST', userId: 'organizer-1', body });
      assert.equal(rejected.status, 400);
      assert.equal(rejected.body.error.code, 'VALIDATION');
    }

    const listing = await call('/api/events');
    assert.equal(listing.status, 200);
    assert.equal(listing.body.events.some((event) => event.id === response.body.event.id), false);
  });

  it('validates tiers, requires a tier to publish, and enforces organizer ownership', async () => {
    const draft = await call('/api/events', {
      method: 'POST',
      userId: 'organizer-2',
      body: {
        title: 'Abuja Jazz Night',
        city: 'Abuja',
        venue: 'Unity Hall',
        startsAt: '2026-11-15T18:00:00.000Z'
      }
    });
    const eventId = draft.body.event.id;
    const noTier = await call(`/api/events/${eventId}/publish`, {
      method: 'POST',
      userId: 'organizer-2'
    });
    assert.equal(noTier.status, 409);
    assert.equal(noTier.body.error.code, 'INVALID_STATE');

    const fractionalPrice = await call(`/api/events/${eventId}/tiers`, {
      method: 'POST',
      userId: 'organizer-2',
      body: { name: 'General', priceCents: 12.5, capacity: 10 }
    });
    assert.equal(fractionalPrice.status, 400);
    assert.equal(fractionalPrice.body.error.code, 'VALIDATION');
    const invalidCapacity = await call(`/api/events/${eventId}/tiers`, {
      method: 'POST',
      userId: 'organizer-2',
      body: { name: 'General', priceCents: 1000, capacity: 0 }
    });
    assert.equal(invalidCapacity.status, 400);
    assert.equal(invalidCapacity.body.error.code, 'VALIDATION');

    const missingEvent = await call('/api/events/missing/tiers', {
      method: 'POST',
      userId: 'organizer-2',
      body: { name: 'General', priceCents: 1000, capacity: 10 }
    });
    assert.equal(missingEvent.status, 404);
    assert.equal(missingEvent.body.error.code, 'NOT_FOUND');

    const tier = await call(`/api/events/${eventId}/tiers`, {
      method: 'POST',
      userId: 'organizer-2',
      body: { name: 'General', priceCents: 15000, capacity: 50 }
    });
    assert.equal(tier.status, 201);
    assert.equal(tier.body.tier.seatsBooked, 0);

    const forbidden = await call(`/api/events/${eventId}/publish`, {
      method: 'POST',
      userId: 'organizer-1'
    });
    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error.code, 'FORBIDDEN');

    const published = await call(`/api/events/${eventId}/publish`, {
      method: 'POST',
      userId: 'organizer-2'
    });
    assert.equal(published.status, 200);
    assert.equal(published.body.event.status, 'PUBLISHED');

    const unpublished = await call(`/api/events/${eventId}/unpublish`, {
      method: 'POST',
      userId: 'organizer-2'
    });
    assert.equal(unpublished.status, 200);
    assert.equal(unpublished.body.event.status, 'DRAFT');
    const hidden = await call('/api/events');
    assert.equal(hidden.body.events.some((event) => event.id === eventId), false);
  });

  it('searches, filters and sorts published events through query parameters', async () => {
    await createPublishedEvent({
      title: 'Zeta Jazz Night',
      city: 'Banjul',
      priceCents: 2200,
      capacity: 3
    });
    await createPublishedEvent({
      title: 'Alpha Tech Meetup',
      city: 'Banjul',
      priceCents: 1000,
      capacity: 3
    });

    const result = await call('/api/events?q=jAZZ&city=banjul&to=2026-12-05&maxPriceCents=2500&sortBy=price');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.events.map((event) => event.title), ['Zeta Jazz Night']);

    for (const path of [
      '/api/events?from=not-a-date',
      '/api/events?maxPriceCents=12.5',
      '/api/events?sortBy=unknown'
    ]) {
      const invalid = await call(path);
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION');
    }
  });

  it('books whole-cent tickets, rejects invalid quantities, and prevents overselling', async () => {
    const { tier } = await createPublishedEvent({ capacity: 3, priceCents: 2500 });
    const booking = await call('/api/bookings', {
      method: 'POST',
      userId: 'attendee-1',
      body: { tierId: tier.id, quantity: 2 }
    });
    assert.equal(booking.status, 201);
    assert.equal(booking.body.booking.status, 'pending');
    assert.equal(booking.body.booking.totalPriceCents, 5000);
    assert.ok(Number.isSafeInteger(booking.body.booking.totalPriceCents));

    for (const quantity of [0, -1, 1.5, 11]) {
      const invalid = await call('/api/bookings', {
        method: 'POST',
        userId: 'attendee-2',
        body: { tierId: tier.id, quantity }
      });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, 'VALIDATION');
    }

    const soldOut = await call('/api/bookings', {
      method: 'POST',
      userId: 'attendee-2',
      body: { tierId: tier.id, quantity: 2 }
    });
    assert.equal(soldOut.status, 409);
    assert.equal(soldOut.body.error.code, 'SOLD_OUT');
  });

  it('keeps declined payments pending, checks ownership, and never charges twice', async () => {
    const { tier } = await createPublishedEvent();
    const booked = await call('/api/bookings', {
      method: 'POST',
      userId: 'attendee-pay',
      body: { tierId: tier.id, quantity: 1 }
    });
    const reference = booked.body.booking.reference;
    const before = chargeRequests.length;

    const declined = await call(`/api/bookings/${reference}/pay`, {
      method: 'POST',
      userId: 'attendee-pay',
      body: { decline: true, cardNumber: 'must-not-reach-gateway' }
    });
    assert.equal(declined.status, 402);
    assert.equal(declined.body.error.code, 'PAYMENT_DECLINED');
    assert.deepEqual(chargeRequests[before], {
      amountCents: 2500,
      shouldDecline: true
    });

    const paid = await call(`/api/bookings/${reference}/pay`, {
      method: 'POST',
      userId: 'attendee-pay',
      body: { decline: false }
    });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.booking.status, 'paid');

    const callsAfterSuccess = chargeRequests.length;
    const duplicate = await call(`/api/bookings/${reference}/pay`, {
      method: 'POST',
      userId: 'attendee-pay',
      body: {}
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'INVALID_TRANSITION');
    assert.equal(chargeRequests.length, callsAfterSuccess);

    const wrongUser = await call(`/api/bookings/${reference}/pay`, {
      method: 'POST',
      userId: 'someone-else',
      body: {}
    });
    assert.equal(wrongUser.status, 403);
    assert.equal(wrongUser.body.error.code, 'FORBIDDEN');
    assert.equal(chargeRequests.length, callsAfterSuccess);
  });

  it('cancels only the attendee’s unpaid booking and releases its seats', async () => {
    const { event, tier } = await createPublishedEvent({
      title: 'Cancellation Capacity Event',
      capacity: 1
    });
    const booked = await call('/api/bookings', {
      method: 'POST',
      userId: 'attendee-cancel',
      body: { tierId: tier.id, quantity: 1 }
    });
    const reference = booked.body.booking.reference;
    const cancelled = await call(`/api/bookings/${reference}/cancel`, {
      method: 'POST',
      userId: 'attendee-cancel'
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.booking.status, 'cancelled');

    const available = await call(`/api/events?q=${encodeURIComponent(event.title)}&onlyAvailable=true`);
    assert.equal(available.body.events.length, 1);
    assert.equal(available.body.events[0].seatsLeft, 1);

    const cannotPay = await call(`/api/bookings/${reference}/pay`, {
      method: 'POST',
      userId: 'attendee-cancel',
      body: {}
    });
    assert.equal(cannotPay.status, 409);
    assert.equal(cannotPay.body.error.code, 'INVALID_TRANSITION');
  });

  it('does not cancel a paid booking', async () => {
    const { tier } = await createPublishedEvent({ title: 'Paid Cancellation Event' });
    const booking = await call('/api/bookings', {
      method: 'POST',
      userId: 'attendee-paid-cancel',
      body: { tierId: tier.id, quantity: 1 }
    });
    const reference = booking.body.booking.reference;
    await call(`/api/bookings/${reference}/pay`, {
      method: 'POST',
      userId: 'attendee-paid-cancel',
      body: {}
    });

    const cancelled = await call(`/api/bookings/${reference}/cancel`, {
      method: 'POST',
      userId: 'attendee-paid-cancel'
    });
    assert.equal(cancelled.status, 409);
    assert.equal(cancelled.body.error.code, 'INVALID_TRANSITION');
  });

  it('requires x-user-id and keeps unknown API errors in the common shape', async () => {
    const missingUser = await call('/api/events', {
      method: 'POST',
      body: { title: 'Event', city: 'City', venue: 'Venue', startsAt: '2026-12-05' }
    });
    assert.equal(missingUser.status, 401);
    assert.deepEqual(Object.keys(missingUser.body.error).sort(), ['code', 'message']);

    const notFound = await call('/api/no-such-route');
    assert.equal(notFound.status, 404);
    assert.deepEqual(Object.keys(notFound.body.error).sort(), ['code', 'message']);
  });
});
