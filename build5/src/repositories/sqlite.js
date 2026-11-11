function mapEvent(row) {
  if (!row) return null;
  const event = {
    id: row.id,
    organizerId: row.organizer_id,
    title: row.title,
    city: row.city,
    venue: row.venue,
    startsAt: row.starts_at,
    status: row.status,
    createdAt: row.created_at
  };
  if (row.published_at !== null) event.publishedAt = row.published_at;
  if (row.unpublished_at !== null) event.unpublishedAt = row.unpublished_at;
  return event;
}

function mapTier(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    priceCents: row.price_cents,
    capacity: row.capacity,
    seatsBooked: row.sold
  };
}

function mapBooking(row) {
  if (!row) return null;
  const booking = {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    eventId: row.event_id,
    tierId: row.tier_id,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    totalPriceCents: row.total_price_cents,
    status: row.status,
    createdAt: row.created_at
  };
  if (row.paid_at !== null) booking.paidAt = row.paid_at;
  if (row.cancelled_at !== null) booking.cancelledAt = row.cancelled_at;
  return booking;
}

export function createSqliteRepository(database) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('A SQLite database is required');
  }

  const ensureUser = database.prepare(
    'INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)'
  );
  const getEvent = database.prepare('SELECT * FROM events WHERE id = ?');
  const saveEvent = database.prepare(`
    INSERT INTO events (
      id, organizer_id, title, city, venue, starts_at, status, created_at,
      published_at, unpublished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      organizer_id = excluded.organizer_id,
      title = excluded.title,
      city = excluded.city,
      venue = excluded.venue,
      starts_at = excluded.starts_at,
      status = excluded.status,
      created_at = excluded.created_at,
      published_at = excluded.published_at,
      unpublished_at = excluded.unpublished_at
  `);
  const listEvents = database.prepare('SELECT * FROM events');
  const getTier = database.prepare('SELECT * FROM ticket_tiers WHERE id = ?');
  const saveTier = database.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, price_cents, capacity, sold)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      event_id = excluded.event_id,
      name = excluded.name,
      price_cents = excluded.price_cents,
      capacity = excluded.capacity,
      sold = excluded.sold
  `);
  const reserveTierSeats = database.prepare(`
    UPDATE ticket_tiers
    SET sold = sold + ?
    WHERE id = ? AND sold + ? <= capacity
  `);
  const listTiersForEvent = database.prepare(
    'SELECT * FROM ticket_tiers WHERE event_id = ?'
  );
  const getBooking = database.prepare('SELECT * FROM bookings WHERE id = ?');
  const getBookingByReference = database.prepare(
    'SELECT * FROM bookings WHERE reference = ?'
  );
  const saveBooking = database.prepare(`
    INSERT INTO bookings (
      id, reference, user_id, event_id, tier_id, quantity, unit_price_cents,
      total_price_cents, status, created_at, paid_at, cancelled_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      reference = excluded.reference,
      user_id = excluded.user_id,
      event_id = excluded.event_id,
      tier_id = excluded.tier_id,
      quantity = excluded.quantity,
      unit_price_cents = excluded.unit_price_cents,
      total_price_cents = excluded.total_price_cents,
      status = excluded.status,
      created_at = excluded.created_at,
      paid_at = excluded.paid_at,
      cancelled_at = excluded.cancelled_at
  `);

  return {
    async getEvent(id) {
      return mapEvent(getEvent.get(id));
    },
    async saveEvent(event) {
      ensureUser.run(event.organizerId, event.createdAt);
      saveEvent.run(
        event.id,
        event.organizerId,
        event.title,
        event.city,
        event.venue,
        event.startsAt,
        event.status,
        event.createdAt,
        event.publishedAt ?? null,
        event.unpublishedAt ?? null
      );
      return event;
    },
    async listEvents() {
      return listEvents.all().map(mapEvent);
    },
    async getTier(id) {
      return mapTier(getTier.get(id));
    },
    async saveTier(tier) {
      saveTier.run(
        tier.id,
        tier.eventId,
        tier.name,
        tier.priceCents,
        tier.capacity,
        tier.seatsBooked
      );
      return tier;
    },
    async reserveTierSeats(id, quantity) {
      return reserveTierSeats.run(quantity, id, quantity).changes === 1;
    },
    async listTiersForEvent(eventId) {
      return listTiersForEvent.all(eventId).map(mapTier);
    },
    async getBooking(id) {
      return mapBooking(getBooking.get(id));
    },
    async getBookingByReference(reference) {
      return mapBooking(getBookingByReference.get(reference));
    },
    async saveBooking(booking) {
      ensureUser.run(booking.userId, booking.createdAt);
      saveBooking.run(
        booking.id,
        booking.reference,
        booking.userId,
        booking.eventId,
        booking.tierId,
        booking.quantity,
        booking.unitPriceCents,
        booking.totalPriceCents,
        booking.status,
        booking.createdAt,
        booking.paidAt ?? null,
        booking.cancelledAt ?? null
      );
      return booking;
    }
  };
}
