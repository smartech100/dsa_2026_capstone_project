import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_DATABASE_PATH = fileURLToPath(new URL('../../data/ticketing.sqlite', import.meta.url));
const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export function createDatabase(path = DEFAULT_DATABASE_PATH) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const database = new DatabaseSync(path);
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(SCHEMA);
  return database;
}
