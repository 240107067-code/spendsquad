import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { today, isIsoDate, wholeNumber } from '../src/validate.js';
import { money, shortDate, dayLabel } from '../public/js/format.js';
import { start, client, newUser } from './helpers.js';

let app;
before(async () => { app = await start(createApp(openDb(':memory:'))); });
after(() => app.close());

const FOOD = 1;
const add = (u, over = {}) => u.post('/api/expenses', { amount: 1500, categoryId: FOOD, note: 'lunch', date: today(), ...over });

test('POST /api/expenses returns 201 with the full expense', async () => {
  const u = await newUser(app.base);
  const r = await add(u);
  assert.equal(r.status, 201);
  assert.deepEqual(Object.keys(r.data.expense).sort(), ['amount', 'categoryId', 'categoryName', 'date', 'edited', 'id', 'note']);
  assert.equal(r.data.expense.amount, 1500);
  assert.equal(r.data.expense.categoryName, 'Food');
  assert.equal(r.data.expense.edited, false);
});

test('amount must be a whole number from 1 to 10 000 000', async () => {
  const u = await newUser(app.base);
  for (const amount of [0, -5, 12.5, 'abc', undefined, null, 10_000_001, '']) {
    assert.equal((await add(u, { amount })).status, 400, String(amount));
  }
  assert.equal((await add(u, { amount: 10_000_000 })).status, 201);
  assert.equal((await add(u, { amount: 1 })).status, 201);
});

test('category must be a default or the user\'s own', async () => {
  const a = await newUser(app.base);
  const b = await newUser(app.base);
  const bCat = (await b.post('/api/categories', { name: 'Gaming' })).data.category.id;
  assert.equal((await add(a, { categoryId: bCat })).status, 400, 'another user\'s category');
  assert.equal((await add(a, { categoryId: 99999 })).status, 400, 'unknown id');
  assert.equal((await add(a, { categoryId: undefined })).status, 400, 'missing');
  const r = await add(b, { categoryId: bCat });
  assert.equal(r.status, 201);
  assert.equal(r.data.expense.categoryName, 'Gaming');
});

test('note is optional, trimmed and at most 200 characters', async () => {
  const u = await newUser(app.base);
  assert.equal((await add(u, { note: undefined })).data.expense.note, '');
  assert.equal((await add(u, { note: '  coffee  ' })).data.expense.note, 'coffee');
  assert.equal((await add(u, { note: 'x'.repeat(201) })).status, 400);
  assert.equal((await add(u, { note: 'x'.repeat(200) })).status, 201);
});

test('date must be a real calendar date, missing means today', async () => {
  const u = await newUser(app.base);
  for (const date of ['2026-02-30', '2026-13-01', '20-10-2026', 'yesterday']) {
    assert.equal((await add(u, { date })).status, 400, date);
  }
  assert.equal((await add(u, { date: undefined })).data.expense.date, today());
  assert.equal((await add(u, { date: '2024-02-29' })).status, 201, 'leap day');
});

test('a date in the future returns 400', async () => {
  const u = await newUser(app.base);
  const tomorrow = new Date(Date.now() + 36 * 3600 * 1000);
  const r = await add(u, { date: today(tomorrow) });
  assert.equal(r.status, 400);
  assert.match(r.data.error, /future/);
});

test('POST /api/expenses returns 401 without a session', async () => {
  assert.equal((await add(client(app.base))).status, 401);
});

test('validation helpers', () => {
  assert.ok(isIsoDate('2026-10-20'));
  assert.ok(!isIsoDate('2026-02-30'));
  assert.equal(wholeNumber('1500', 1, 10), null);
  assert.equal(wholeNumber('7', 1, 10), 7);
  assert.equal(wholeNumber(7.5, 1, 10), null);
});

test('frontend formatting helpers', () => {
  assert.equal(money(12500), '12 500 ₸');
  assert.equal(money(1000000), '1 000 000 ₸');
  assert.equal(money(0), '0 ₸');
  assert.equal(shortDate('2026-10-20'), '20 Oct');
  assert.equal(dayLabel('2026-10-20'), 'Tue, 20 Oct');
});
