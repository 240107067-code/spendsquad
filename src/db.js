import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
export const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Study', 'Entertainment', 'Other'];

// Open (or create) the database and make sure the schema and default categories exist.
// Use openDb(':memory:') in tests.
export function openDb(file = ':memory:') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  const insert = db.prepare('INSERT OR IGNORE INTO categories (user_id, name) VALUES (NULL, ?)');
  for (const name of DEFAULT_CATEGORIES) insert.run(name);
  return db;
}
