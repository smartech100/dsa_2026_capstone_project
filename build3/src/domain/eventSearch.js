import { DomainError, assertValid } from './errors.js';
import { mergeSort } from './sorting.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_SORT = new Set(['date', 'price', 'availability']);

function parseBoundary(value, { endOfDay } = { endOfDay: false }) {
  assertValid(typeof value === 'string' && value.trim() !== '', 'Date filter must be a non-empty ISO string');
  const trimmed = value.trim();
  const ms = Date.parse(trimmed);
  assertValid(!Number.isNaN(ms), `Invalid date: ${value}`);

  if (endOfDay && DATE_ONLY.test(trimmed)) {
    // Inclusive date-only `to`: keep the whole calendar day in UTC.
    return Date.parse(`${trimmed}T23:59:59.999Z`);
  }
  return ms;
}

function assertWholeCents(value, label) {
  assertValid(Number.isSafeInteger(value), `${label} must be a whole number of cents`);
}

function compareTitleThenId(a, b) {
  const byTitle = a.title.localeCompare(b.title);
  if (byTitle !== 0) return byTitle;
  return a.id.localeCompare(b.id);
}

/**
 * Filters event summaries. Returns a new array; never mutates the input.
 * Events with no tiers are excluded when a price filter is applied.
 */
export function filterEvents(summaries, {
  q,
  city,
  from,
  to,
  maxPriceCents,
  onlyAvailable
} = {}) {
  assertValid(Array.isArray(summaries), 'summaries must be an array');

  let fromMs;
  let toMs;
  if (from !== undefined && from !== null && from !== '') {
    fromMs = parseBoundary(from, { endOfDay: false });
  }
  if (to !== undefined && to !== null && to !== '') {
    toMs = parseBoundary(to, { endOfDay: true });
  }
  if (maxPriceCents !== undefined && maxPriceCents !== null && maxPriceCents !== '') {
    assertWholeCents(maxPriceCents, 'maxPriceCents');
  }

  const qNeedle = typeof q === 'string' && q.trim() !== '' ? q.trim().toLowerCase() : null;
  const cityNeedle = typeof city === 'string' && city.trim() !== '' ? city.trim().toLowerCase() : null;
  const priceCap = maxPriceCents !== undefined && maxPriceCents !== null && maxPriceCents !== ''
    ? maxPriceCents
    : null;

  return summaries.filter((event) => {
    if (qNeedle) {
      const title = String(event.title ?? '').toLowerCase();
      const venue = String(event.venue ?? '').toLowerCase();
      if (!title.includes(qNeedle) && !venue.includes(qNeedle)) return false;
    }

    if (cityNeedle) {
      if (String(event.city ?? '').toLowerCase() !== cityNeedle) return false;
    }

    if (fromMs !== undefined || toMs !== undefined) {
      const startMs = Date.parse(event.startsAt);
      if (Number.isNaN(startMs)) return false;
      if (fromMs !== undefined && startMs < fromMs) return false;
      if (toMs !== undefined && startMs > toMs) return false;
    }

    if (priceCap !== null) {
      // Events with no tiers are left out of price filters.
      if (event.minPriceCents === null || event.minPriceCents === undefined) return false;
      if (event.minPriceCents > priceCap) return false;
    }

    if (onlyAvailable) {
      if (!(event.seatsLeft > 0)) return false;
    }

    return true;
  });
}

/**
 * Sorts event summaries with a stable merge sort.
 * Ties always break by title, then id.
 */
export function sortEvents(summaries, sortBy = 'date') {
  assertValid(Array.isArray(summaries), 'summaries must be an array');
  if (!ALLOWED_SORT.has(sortBy)) {
    throw new DomainError('VALIDATION', `Unknown sortBy: ${sortBy}`);
  }

  const compare = (a, b) => {
    let primary = 0;
    if (sortBy === 'date') {
      primary = Date.parse(a.startsAt) - Date.parse(b.startsAt);
    } else if (sortBy === 'price') {
      const ap = a.minPriceCents;
      const bp = b.minPriceCents;
      const aMissing = ap === null || ap === undefined;
      const bMissing = bp === null || bp === undefined;
      if (aMissing && bMissing) primary = 0;
      else if (aMissing) primary = 1; // no price last
      else if (bMissing) primary = -1;
      else primary = ap - bp;
    } else if (sortBy === 'availability') {
      primary = (b.seatsLeft ?? 0) - (a.seatsLeft ?? 0); // most seats left first
    }

    if (primary !== 0) return primary;
    return compareTitleThenId(a, b);
  };

  return mergeSort(summaries, compare);
}

/** Filter then sort. Pure: events in, new list out. */
export function searchEvents(summaries, criteria = {}, sortBy = 'date') {
  return sortEvents(filterEvents(summaries, criteria), sortBy);
}
