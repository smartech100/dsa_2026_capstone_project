import { performance } from 'node:perf_hooks';

const BOOKINGS = 100_000;
const LOOKUPS = 500;
const bookings = Array.from({ length: BOOKINGS }, (_, index) => ({
  id: `booking-${index}`,
  reference: `REF-${String(index).padStart(6, '0')}`
}));
const byReference = new Map(bookings.map((booking) => [booking.reference, booking]));
const targets = Array.from({ length: LOOKUPS }, (_, index) =>
  `REF-${String((index * 199) % BOOKINGS).padStart(6, '0')}`
);

function timeLookups(label, lookup) {
  // Consume results so both strategies do equivalent work.
  let found = 0;
  const start = performance.now();
  for (const reference of targets) {
    if (lookup(reference)) found += 1;
  }
  const elapsed = performance.now() - start;
  console.log(`${label}: ${elapsed.toFixed(3)} ms (${found}/${targets.length} found)`);
  return elapsed;
}

console.log(`Looking up ${LOOKUPS} references among ${BOOKINGS.toLocaleString()} bookings`);
const arrayTime = timeLookups('Array.find', (reference) => bookings.find((booking) => booking.reference === reference));
const mapTime = timeLookups('Map.get', (reference) => byReference.get(reference));
console.log(`Array.find / Map.get ratio: ${(arrayTime / Math.max(mapTime, 0.001)).toFixed(1)}x`);
console.log('Timings vary by machine and run; compare the trend rather than expecting an exact ratio.');
