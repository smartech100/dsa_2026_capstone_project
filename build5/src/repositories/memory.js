export function createMemoryRepository() {
  const events = new Map();
  const tiers = new Map();
  const bookings = new Map();
  const bookingReferences = new Map();

  return {
    async getEvent(id) {
      return events.get(id) ?? null;
    },
    async saveEvent(event) {
      events.set(event.id, event);
      return event;
    },
    async listEvents() {
      return [...events.values()];
    },
    async getTier(id) {
      return tiers.get(id) ?? null;
    },
    async saveTier(tier) {
      tiers.set(tier.id, tier);
      return tier;
    },
    async reserveTierSeats(id, quantity) {
      const tier = tiers.get(id);
      if (!tier || tier.seatsBooked + quantity > tier.capacity) return false;
      tier.seatsBooked += quantity;
      return true;
    },
    async listTiersForEvent(eventId) {
      return [...tiers.values()].filter((tier) => tier.eventId === eventId);
    },
    async getBooking(id) {
      return bookings.get(id) ?? null;
    },
    async getBookingByReference(reference) {
      const id = bookingReferences.get(reference);
      return id === undefined ? null : bookings.get(id) ?? null;
    },
    async saveBooking(booking) {
      const previous = bookings.get(booking.id);
      if (previous && previous.reference !== booking.reference) {
        bookingReferences.delete(previous.reference);
      }
      bookings.set(booking.id, booking);
      bookingReferences.set(booking.reference, booking.id);
      return booking;
    }
  };
}
