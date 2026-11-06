import { DomainError, assertValid } from '../domain/errors.js';
import { createBookingService } from '../services/bookingService.js';
import { createEventService } from '../services/eventService.js';
import { Router } from './router.js';

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function requireUserId(request) {
  const userId = request.headers['x-user-id'];
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new DomainError('UNAUTHENTICATED', 'x-user-id header is required');
  }
  return userId.trim();
}

function parseIntegerQuery(value, name) {
  if (value === null) return undefined;
  if (!/^-?\d+$/.test(value)) {
    throw new DomainError('VALIDATION', `${name} must be a whole number`);
  }
  const number = Number(value);
  assertValid(Number.isSafeInteger(number), `${name} must be a whole number`);
  return number;
}

function parseOnlyAvailable(value) {
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new DomainError('VALIDATION', 'onlyAvailable must be true or false');
}

function parseDecline(input) {
  assertValid(input !== null && typeof input === 'object' && !Array.isArray(input),
    'Payment details must be a JSON object');
  const value = Object.hasOwn(input, 'decline') ? input.decline : false;
  assertValid(typeof value === 'boolean', 'decline must be a boolean');
  return value;
}

export function createApiRouter({ repository, paymentGateway }) {
  const router = new Router();
  const events = createEventService(repository);
  const bookings = createBookingService(repository, paymentGateway);

  router.add('POST', '/api/events', async (request, response) => {
    const event = await events.createEvent(requireUserId(request), request.body);
    sendJson(response, 201, { event });
  });

  router.add('POST', '/api/events/:id/tiers', async (request, response, { id }) => {
    const tier = await events.addTier(requireUserId(request), id, request.body);
    sendJson(response, 201, { tier });
  });

  router.add('POST', '/api/events/:id/publish', async (request, response, { id }) => {
    const event = await events.publishEvent(requireUserId(request), id);
    sendJson(response, 200, { event });
  });

  router.add('POST', '/api/events/:id/unpublish', async (request, response, { id }) => {
    const event = await events.unpublishEvent(requireUserId(request), id);
    sendJson(response, 200, { event });
  });

  router.get('/api/events', async (request, response) => {
    const query = new URL(request.url, 'http://localhost').searchParams;
    const criteria = {
      q: query.get('q') ?? undefined,
      city: query.get('city') ?? undefined,
      from: query.get('from') ?? undefined,
      to: query.get('to') ?? undefined,
      maxPriceCents: parseIntegerQuery(query.get('maxPriceCents'), 'maxPriceCents'),
      onlyAvailable: parseOnlyAvailable(query.get('onlyAvailable'))
    };
    const results = await events.listEvents(criteria, query.get('sortBy') ?? 'date');
    sendJson(response, 200, { events: results });
  });

  router.add('POST', '/api/bookings', async (request, response) => {
    const booking = await bookings.createBooking(requireUserId(request), request.body);
    sendJson(response, 201, { booking });
  });

  router.add('POST', '/api/bookings/:reference/pay', async (request, response, { reference }) => {
    const booking = await bookings.payBooking(
      requireUserId(request),
      reference,
      { decline: parseDecline(request.body === undefined ? {} : request.body) }
    );
    sendJson(response, 200, { booking });
  });

  router.add('POST', '/api/bookings/:reference/cancel', async (request, response, { reference }) => {
    const booking = await bookings.cancelBooking(requireUserId(request), reference);
    sendJson(response, 200, { booking });
  });

  return router;
}
