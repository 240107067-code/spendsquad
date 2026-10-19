import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, DEFAULT_CATEGORIES } from '../src/db.js';

function seed(db) {
  db.prepare("INSERT INTO users (email, name, password_hash) VALUES ('a@x.kz', 'A', 'h')").run();
  db.prepare("INSERT INTO challenges (name, creator_id, start_week, weeks, invite_token) VALUES ('C', 1, '2026-10-19', 2, 't')").run();
}

test('all MVP tables exist', () => {
  const db = openDb(':memory:');
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
  for (const t of ['users', 'sessions', 'categories', 'expenses', 'challenges', 'participants']) assert.ok(names.includes(t), t);
});

test('the five default categories are seeded once, even when opened twice', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ss-')), 'nested', 'test.db');
  openDb(file).close();
  const db = openDb(file);
  const rows = db.prepare('SELECT name FROM categories WHERE user_id IS NULL ORDER BY id').all().map((r) => r.name);
  assert.deepEqual(rows, DEFAULT_CATEGORIES);
  assert.ok(fs.existsSync(file), 'creates the missing folder');
});

test('duplicate email is rejected regardless of letter case', () => {
  const db = openDb(':memory:');
  seed(db);
  assert.throws(() => db.prepare("INSERT INTO users (email, name, password_hash) VALUES ('A@X.KZ', 'B', 'h')").run(), /UNIQUE/);
});

test('a user cannot have two categories with the same name, other users can', () => {
  const db = openDb(':memory:');
  seed(db);
  db.prepare("INSERT INTO users (email, name, password_hash) VALUES ('b@x.kz', 'B', 'h')").run();
  db.prepare("INSERT INTO categories (user_id, name) VALUES (1, 'Coffee')").run();
  assert.throws(() => db.prepare("INSERT INTO categories (user_id, name) VALUES (1, 'coffee')").run(), /UNIQUE/);
  db.prepare("INSERT INTO categories (user_id, name) VALUES (2, 'Coffee')").run();
});

test('expense amount must be positive and edited defaults to 0', () => {
  const db = openDb(':memory:');
  seed(db);
  const ins = db.prepare("INSERT INTO expenses (user_id, category_id, amount, date) VALUES (1, 1, ?, '2026-10-20')");
  assert.throws(() => ins.run(0), /CHECK/);
  assert.throws(() => ins.run(-5), /CHECK/);
  ins.run(1500);
  const row = db.prepare('SELECT edited, created_at, updated_at FROM expenses').get();
  assert.equal(row.edited, 0);
  assert.ok(row.created_at && row.updated_at);
});

test('challenge weeks must be 1 to 4 and invite tokens are unique', () => {
  const db = openDb(':memory:');
  seed(db);
  const ins = db.prepare("INSERT INTO challenges (name, creator_id, start_week, weeks, invite_token) VALUES ('C', 1, '2026-10-19', ?, ?)");
  assert.throws(() => ins.run(0, 'a'), /CHECK/);
  assert.throws(() => ins.run(5, 'b'), /CHECK/);
  assert.throws(() => ins.run(2, 't'), /UNIQUE/);
});

test('participant budget must be positive and a user joins a challenge once', () => {
  const db = openDb(':memory:');
  seed(db);
  const ins = db.prepare('INSERT INTO participants (challenge_id, user_id, budget) VALUES (1, 1, ?)');
  assert.throws(() => ins.run(0), /CHECK/);
  ins.run(20000);
  assert.throws(() => ins.run(30000), /UNIQUE/);
});

test('foreign keys are enforced', () => {
  const db = openDb(':memory:');
  assert.throws(() => db.prepare("INSERT INTO sessions (token, user_id) VALUES ('x', 999)").run(), /FOREIGN KEY/);
});
