import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../src/http/router.js';

describe('Router', () => {
  it('matches method and path and decodes named parameters', () => {
    const router = new Router();
    const handler = () => {};
    router.add('GET', '/events/:eventId/bookings/:bookingId', handler);

    const route = router.match('get', '/events/event%201/bookings/booking-2');
    assert.equal(route.handler, handler);
    assert.deepEqual(route.params, { eventId: 'event 1', bookingId: 'booking-2' });
  });

  it('does not match another method or path', () => {
    const router = new Router();
    router.get('/events/:eventId', () => {});

    assert.equal(router.match('POST', '/events/one'), null);
    assert.equal(router.match('GET', '/events/one/bookings'), null);
  });

  it('matches the root path', () => {
    const router = new Router();
    const handler = () => {};
    router.get('/', handler);

    assert.equal(router.match('GET', '/').handler, handler);
  });
});
