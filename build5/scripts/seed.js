import { createDatabase } from '../src/db/connection.js';

const database = createDatabase();

try {
  const insertUser = database.prepare(
    'INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)'
  );
  const insertEvent = database.prepare(`
    INSERT OR IGNORE INTO events (
      id, organizer_id, title, city, venue, starts_at, status, created_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTier = database.prepare(`
    INSERT OR IGNORE INTO ticket_tiers (
      id, event_id, name, price_cents, capacity, sold
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const createdAt = new Date().toISOString();

  insertUser.run('seed-organizer', createdAt);
  insertEvent.run(
    'seed-event',
    'seed-organizer',
    'Build 5 Sample Concert',
    'Banjul',
    'Arch 22 Hall',
    '2026-12-05T17:00:00.000Z',
    'PUBLISHED',
    createdAt,
    createdAt
  );
  insertTier.run('seed-tier', 'seed-event', 'General Admission', 2500, 100, 0);

  console.log('Seed data is ready; existing rows were left unchanged.');
} finally {
  database.close();
}
