import {
  createStore,
  createEvent,
  addTier,
  publishEvent,
  listEventSummaries,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  peekWaitlist
} from '../src/domain/inventory.js';
import { searchEvents } from '../src/domain/eventSearch.js';
import { DomainError } from '../src/domain/errors.js';

const store = createStore();

const banjul = createEvent(store, {
  title: 'Banjul Tech Meetup',
  city: 'Banjul',
  venue: 'Arch 22 Hall',
  startsAt: '2026-12-05T17:00:00.000Z',
  capacity: 3
});
const general = addTier(store, banjul.id, {
  name: 'General Admission',
  // 25.00 GMD = 2500 bututs (stored in priceCents)
  priceCents: 2500,
  capacity: 3
});
publishEvent(store, banjul.id);

const serekunda = createEvent(store, {
  title: 'Serekunda Jazz Night',
  city: 'Serekunda',
  venue: 'Senegambia Beach Stage',
  startsAt: '2026-12-12T19:00:00.000Z'
});
addTier(store, serekunda.id, { name: 'General', priceCents: 50000, capacity: 100 });
publishEvent(store, serekunda.id);

console.log(`Event: ${banjul.title} (${banjul.city}) — ${general.priceCents} bututs each`);
console.log(`Public list: ${listEventSummaries(store).map((e) => e.title).join(', ')}`);

const jazzHits = searchEvents(listEventSummaries(store), { q: 'JAZZ' }, 'date');
console.log(`Search "JAZZ": ${jazzHits.map((e) => e.title).join(', ') || '(none)'}`);

const ada = bookTickets(store, {
  eventId: banjul.id,
  tierId: general.id,
  attendeeName: 'Ada',
  quantity: 2
});
console.log(`\n${ada.attendeeName} booked ${ada.quantity} tickets (${ada.status}). Reference: ${ada.reference}`);

try {
  bookTickets(store, {
    eventId: banjul.id,
    tierId: general.id,
    attendeeName: 'Bayo',
    quantity: 2
  });
} catch (error) {
  if (!(error instanceof DomainError)) throw error;
  console.log(`Bayo's booking refused: ${error.code} — ${error.message}`);
}

const bayoWait = joinWaitlist(store, {
  eventId: banjul.id,
  tierId: general.id,
  attendeeName: 'Bayo',
  quantity: 1
});
const fatouWait = joinWaitlist(store, {
  eventId: banjul.id,
  tierId: general.id,
  attendeeName: 'Fatou',
  quantity: 1
});
console.log(`\nWaitlist: ${bayoWait.attendeeName} joined first; ${fatouWait.attendeeName} joined second.`);
console.log(`Find booking by reference: ${findBookingByReference(store, ada.reference).attendeeName}`);

cancelBooking(store, ada.id);
console.log(`\n${ada.attendeeName} cancelled. Seats now available: ${general.capacity - general.seatsBooked}`);
console.log(`Next person in line: ${peekWaitlist(store, banjul.id, general.id).attendeeName}`);
