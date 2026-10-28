import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  peekWaitlist
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

const store = createStore();
const event = createEvent(store, { name: 'Banjul Tech Meetup', capacity: 3 });
const tier = addTier(store, event.id, { name: 'General Admission', priceCents: 2500, capacity: 3 });

console.log(`Event: ${event.name} (${event.capacity} seats)`);
console.log(`Ticket: ${tier.name} — ${tier.priceCents} cents each`);

const ada = bookTickets(store, { eventId: event.id, tierId: tier.id, attendeeName: 'Ada', quantity: 2 });
console.log(`\n${ada.attendeeName} booked ${ada.quantity} tickets. Reference: ${ada.reference}`);

try {
  bookTickets(store, { eventId: event.id, tierId: tier.id, attendeeName: 'Bayo', quantity: 2 });
} catch (error) {
  if (!(error instanceof DomainError)) throw error;
  console.log(`Bayo's booking refused: ${error.code} — ${error.message}`);
}

const bayoWait = joinWaitlist(store, { eventId: event.id, tierId: tier.id, attendeeName: 'Bayo', quantity: 1 });
const fatouWait = joinWaitlist(store, { eventId: event.id, tierId: tier.id, attendeeName: 'Fatou', quantity: 1 });
console.log(`\nWaitlist: ${bayoWait.attendeeName} joined first; ${fatouWait.attendeeName} joined second.`);
console.log(`Find booking by reference: ${findBookingByReference(store, ada.reference).attendeeName}`);

cancelBooking(store, ada.id);
console.log(`\n${ada.attendeeName} cancelled. Seats now available: ${tier.capacity - tier.seatsBooked}`);
console.log(`Next person in line: ${peekWaitlist(store, event.id, tier.id).attendeeName}`);
