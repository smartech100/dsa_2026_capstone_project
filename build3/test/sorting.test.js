import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.js';
import { mergeSort } from '../src/domain/sorting.js';
import { filterEvents, sortEvents, searchEvents } from '../src/domain/eventSearch.js';

function summary(partial) {
  return {
    id: partial.id,
    title: partial.title,
    city: partial.city,
    venue: partial.venue ?? 'Venue',
    startsAt: partial.startsAt,
    status: partial.status ?? 'PUBLISHED',
    minPriceCents: partial.minPriceCents ?? null,
    seatsLeft: partial.seatsLeft ?? 0,
    tierCount: partial.tierCount ?? (partial.minPriceCents == null ? 0 : 1)
  };
}

const banjulTech = summary({
  id: 'evt-banjul-tech',
  title: 'Banjul Tech Meetup',
  city: 'Banjul',
  venue: 'Arch 22 Hall',
  startsAt: '2026-12-05T17:00:00.000Z',
  minPriceCents: 2500,
  seatsLeft: 30
});

const serekundaJazz = summary({
  id: 'evt-serekunda-jazz',
  title: 'Serekunda Jazz Night',
  city: 'Serekunda',
  venue: 'Senegambia Beach Stage',
  startsAt: '2026-12-05T20:00:00.000Z',
  minPriceCents: 50000,
  seatsLeft: 10
});

const banjulCheap = summary({
  id: 'evt-banjul-cheap',
  title: 'Banjul Morning Market',
  city: 'Banjul',
  venue: 'Albert Market',
  startsAt: '2026-12-10T18:00:00.000Z',
  minPriceCents: 1000,
  seatsLeft: 100
});

const serekundaNoTiers = summary({
  id: 'evt-serekunda-soft',
  title: 'Serekunda Soft Launch',
  city: 'Serekunda',
  venue: 'Kairaba Avenue',
  startsAt: '2026-12-08T12:00:00.000Z',
  minPriceCents: null,
  seatsLeft: 0,
  tierCount: 0
});

describe('mergeSort', () => {
  it('returns a new array and does not mutate the input', () => {
    const items = [3, 1, 2];
    const frozen = [...items];
    const sorted = mergeSort(items, (a, b) => a - b);
    assert.deepEqual(sorted, [1, 2, 3]);
    assert.deepEqual(items, frozen);
    assert.notEqual(sorted, items);
  });

  it('is stable for equal keys', () => {
    const items = [
      { key: 1, label: 'first' },
      { key: 2, label: 'second' },
      { key: 1, label: 'third' },
      { key: 1, label: 'fourth' }
    ];
    const frozen = items.map((x) => ({ ...x }));
    const sorted = mergeSort(items, (a, b) => a.key - b.key);
    assert.deepEqual(
      sorted.filter((x) => x.key === 1).map((x) => x.label),
      ['first', 'third', 'fourth']
    );
    assert.deepEqual(items, frozen);
  });

  it('handles an empty list', () => {
    assert.deepEqual(mergeSort([], (a, b) => a - b), []);
  });
});

describe('eventSearch', () => {
  it('text search for JAZZ returns only Serekunda Jazz Night', () => {
    const results = filterEvents([banjulTech, serekundaJazz], { q: 'JAZZ' });
    assert.deepEqual(results.map((e) => e.title), ['Serekunda Jazz Night']);
  });

  it('city filter matches exactly ignoring case', () => {
    const results = filterEvents([banjulTech, serekundaJazz, banjulCheap], { city: 'banjul' });
    assert.deepEqual(results.map((e) => e.city), ['Banjul', 'Banjul']);
  });

  it('max price filter keeps cheapest-within-cap events, drops no-tier events, sorts cheapest first', () => {
    const input = [serekundaJazz, banjulTech, serekundaNoTiers, banjulCheap];
    const results = searchEvents(input, { maxPriceCents: 2500 }, 'price');
    assert.deepEqual(
      results.map((e) => e.title),
      ['Banjul Morning Market', 'Banjul Tech Meetup']
    );
    assert.ok(!results.some((e) => e.id === serekundaNoTiers.id));
  });

  it('sort by date: earlier first; same-day events keep title order', () => {
    const sameTimeA = summary({
      id: 'a',
      title: 'Zebra Talk',
      city: 'Banjul',
      startsAt: '2026-12-05T17:00:00.000Z',
      minPriceCents: 1000,
      seatsLeft: 5
    });
    const sameTimeB = summary({
      id: 'b',
      title: 'Apple Talk',
      city: 'Banjul',
      startsAt: '2026-12-05T17:00:00.000Z',
      minPriceCents: 1000,
      seatsLeft: 5
    });
    const later = summary({
      id: 'c',
      title: 'Morning After',
      city: 'Serekunda',
      startsAt: '2026-12-06T09:00:00.000Z',
      minPriceCents: 1000,
      seatsLeft: 5
    });

    const sorted = sortEvents([sameTimeA, later, sameTimeB], 'date');
    assert.deepEqual(
      sorted.map((e) => e.title),
      ['Apple Talk', 'Zebra Talk', 'Morning After']
    );
  });

  it('date-only to includes an event at 5 PM on that day', () => {
    const results = filterEvents([banjulTech], { to: '2026-12-05' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, banjulTech.id);
  });

  it('bad date is VALIDATION', () => {
    assert.throws(
      () => filterEvents([banjulTech], { from: 'not-a-date' }),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
  });

  it('non-whole maxPriceCents is VALIDATION', () => {
    assert.throws(
      () => filterEvents([banjulTech], { maxPriceCents: 12.34 }),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
  });

  it('unknown sortBy is VALIDATION', () => {
    assert.throws(
      () => sortEvents([banjulTech], 'popularity'),
      (err) => err instanceof DomainError && err.code === 'VALIDATION'
    );
  });

  it('filtering and sorting leave the original list unchanged', () => {
    const original = [serekundaJazz, banjulTech, banjulCheap];
    const snapshot = original.map((e) => ({ ...e }));
    filterEvents(original, { city: 'Banjul' });
    sortEvents(original, 'price');
    searchEvents(original, { q: 'tech' }, 'availability');
    assert.deepEqual(original, snapshot);
  });

  it('handles an empty list', () => {
    assert.deepEqual(filterEvents([], { q: 'anything' }), []);
    assert.deepEqual(sortEvents([], 'date'), []);
    assert.deepEqual(searchEvents([], { city: 'Banjul' }, 'price'), []);
  });

  it('sort by availability puts most seats left first', () => {
    const sorted = sortEvents([banjulTech, serekundaJazz, banjulCheap], 'availability');
    assert.deepEqual(
      sorted.map((e) => e.title),
      ['Banjul Morning Market', 'Banjul Tech Meetup', 'Serekunda Jazz Night']
    );
  });
});
