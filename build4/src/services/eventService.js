import { DomainError, assertValid } from '../domain/errors.js';
import { newId } from '../domain/ids.js';
import { searchEvents } from '../domain/eventSearch.js';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidDate(value) {
  if (typeof value !== 'string') return false;
  const match = DATE_ONLY.exec(value) ?? ISO_DATE_TIME.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
}

function requireOwner(event, userId) {
  if (event.organizerId !== userId) {
    throw new DomainError('FORBIDDEN', 'Only the event organizer can change this event');
  }
}

export function createEventService(repository) {
  assertValid(repository && typeof repository.getEvent === 'function'
    && typeof repository.saveEvent === 'function'
    && typeof repository.listEvents === 'function'
    && typeof repository.getTier === 'function'
    && typeof repository.saveTier === 'function'
    && typeof repository.listTiersForEvent === 'function',
  'An event repository is required');

  return {
    async createEvent(organizerId, input) {
      assertValid(isNonEmptyString(organizerId), 'x-user-id must be a non-empty string');
      assertValid(isRecord(input), 'Event details must be a JSON object');
      const { title, city, venue, startsAt } = input;
      assertValid(isNonEmptyString(title), 'Event title must be a non-empty string');
      assertValid(isNonEmptyString(city), 'Event city must be a non-empty string');
      assertValid(isNonEmptyString(venue), 'Event venue must be a non-empty string');
      assertValid(isValidDate(startsAt), 'Event startsAt must be a valid ISO date string');

      const event = {
        id: newId(),
        organizerId,
        title: title.trim(),
        city: city.trim(),
        venue: venue.trim(),
        startsAt: startsAt.trim(),
        status: 'DRAFT',
        createdAt: new Date().toISOString()
      };
      return repository.saveEvent(event);
    },

    async addTier(organizerId, eventId, input) {
      assertValid(isNonEmptyString(organizerId), 'x-user-id must be a non-empty string');
      assertValid(isRecord(input), 'Ticket tier details must be a JSON object');
      const event = await repository.getEvent(eventId);
      if (!event) throw new DomainError('NOT_FOUND', `Event not found: ${eventId}`);
      requireOwner(event, organizerId);
      if (event.status !== 'DRAFT') {
        throw new DomainError('INVALID_STATE', 'Ticket tiers can only be added to draft events');
      }

      const { name, priceCents, capacity } = input;
      assertValid(isNonEmptyString(name), 'Ticket tier name must be a non-empty string');
      assertValid(Number.isSafeInteger(priceCents) && priceCents >= 0,
        'priceCents must be a non-negative whole number of cents');
      assertValid(Number.isSafeInteger(capacity) && capacity > 0,
        'Tier capacity must be a positive whole number');

      const tier = {
        id: newId(),
        eventId,
        name: name.trim(),
        priceCents,
        capacity,
        seatsBooked: 0
      };
      return repository.saveTier(tier);
    },

    async publishEvent(organizerId, eventId) {
      assertValid(isNonEmptyString(organizerId), 'x-user-id must be a non-empty string');
      const event = await repository.getEvent(eventId);
      if (!event) throw new DomainError('NOT_FOUND', `Event not found: ${eventId}`);
      requireOwner(event, organizerId);
      if (event.status !== 'DRAFT') {
        throw new DomainError('INVALID_STATE', 'Only draft events can be published');
      }
      const tiers = await repository.listTiersForEvent(eventId);
      if (tiers.length === 0) {
        throw new DomainError('INVALID_STATE', 'Cannot publish an event with no ticket tiers');
      }
      event.status = 'PUBLISHED';
      event.publishedAt = new Date().toISOString();
      return repository.saveEvent(event);
    },

    async unpublishEvent(organizerId, eventId) {
      assertValid(isNonEmptyString(organizerId), 'x-user-id must be a non-empty string');
      const event = await repository.getEvent(eventId);
      if (!event) throw new DomainError('NOT_FOUND', `Event not found: ${eventId}`);
      requireOwner(event, organizerId);
      if (event.status !== 'PUBLISHED') {
        throw new DomainError('INVALID_STATE', 'Only published events can be unpublished');
      }
      event.status = 'DRAFT';
      event.unpublishedAt = new Date().toISOString();
      return repository.saveEvent(event);
    },

    async listEvents(criteria = {}, sortBy = 'date') {
      const events = (await repository.listEvents()).filter((event) => event.status === 'PUBLISHED');
      const summaries = await Promise.all(events.map(async (event) => {
        const tiers = await repository.listTiersForEvent(event.id);
        const prices = tiers.map((tier) => tier.priceCents);
        return {
          id: event.id,
          title: event.title,
          city: event.city,
          venue: event.venue,
          startsAt: event.startsAt,
          status: event.status,
          minPriceCents: prices.length === 0 ? null : Math.min(...prices),
          seatsLeft: tiers.reduce((total, tier) => total + tier.capacity - tier.seatsBooked, 0),
          tierCount: tiers.length
        };
      }));
      return searchEvents(summaries, criteria, sortBy);
    }
  };
}
