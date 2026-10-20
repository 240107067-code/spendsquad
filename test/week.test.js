import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, weekEnd, addDays, isMonday } from '../src/week.js';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { today } from '../src/validate.js';
import { start, client, newUser } from './helpers.js';

test('weekStart returns the Monday for every day of the week', () => {
  assert.equal(weekStart('2026-10-19'), '2026-10-19'); // Monday
  assert.equal(weekStart('2026-10-21'), '2026-10-19'); // Wednesday
  assert.equal(weekStart('2026-10-25'), '2026-10-19'); // Sunday
  assert.equal(weekStart('2026-10-26'), '2026-10-26'); // next Monday
});

test('weeks across month and year boundaries', () => {
  assert.equal(weekStart('2026-11-01'), '2026-10-26'); // Sunday 1 Nov
  assert.equal(weekStart('2027-01-01'), '2026-12-28'); // Friday 1 Jan
  assert.equal(weekEnd('2026-12-30'), '2027-01-03');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.ok(isMonday('2026-10-19') && !isMonday('2026-10-20'));
});

let app;
before(async () => { app = await start(createApp(openDb(':memory:'))); });
after(() => app.close());

const add = (u, date, amount, categoryId = 1, note = '') => u.post('/api/expenses', { amount, categoryId, date, note });
const thisMonday = weekStart(today());

test('GET /api/expenses returns the current week by default', async () => {
  const u = await newUser(app.base);
  const r = await u.get('/api/expenses');
  assert.equal(r.status, 200);
  assert.equal(r.data.weekStart, thisMonday);
  assert.equal(r.data.weekEnd, addDays(thisMonday, 6));
  assert.equal(r.data.isCurrent, true);
  assert.equal(r.data.nextWeek, null);
  assert.equal(r.data.prevWeek, addDays(thisMonday, -7));
});

test('an empty week returns empty lists and a zero total', async () => {
  const u = await newUser(app.base);
  const r = await u.get('/api/expenses');
  assert.deepEqual(r.data.expenses, []);
  assert.equal(r.data.total, 0);
  assert.deepEqual(r.data.byCategory, []);
});

test('any date selects its Monday–Sunday week, boundaries included', async () => {
  const u = await newUser(app.base);
  const mon = '2026-10-12';
  const sun = '2026-10-18';
  await add(u, addDays(mon, -1), 111); // Sunday before: excluded
  await add(u, mon, 1000);
  await add(u, sun, 2000);
  await add(u, addDays(sun, 1), 222); // next Monday: excluded
  const r = await u.get('/api/expenses?week=2026-10-15');
  assert.equal(r.data.weekStart, mon);
  assert.equal(r.data.weekEnd, sun);
  assert.deepEqual(r.data.expenses.map((e) => e.amount), [2000, 1000], 'newest date first');
  assert.equal(r.data.total, 3000);
  assert.equal(r.data.isCurrent, false);
  assert.equal(r.data.nextWeek, '2026-10-19');
});

test('byCategory sums per category, largest first', async () => {
  const u = await newUser(app.base);
  await add(u, '2026-10-13', 500, 1); // Food
  await add(u, '2026-10-14', 700, 1); // Food
  await add(u, '2026-10-14', 3000, 2); // Transport
  const r = await u.get('/api/expenses?week=2026-10-13');
  assert.deepEqual(r.data.byCategory, [
    { categoryId: 2, name: 'Transport', total: 3000 },
    { categoryId: 1, name: 'Food', total: 1200 },
  ]);
});

test('only the user\'s own expenses are returned', async () => {
  const a = await newUser(app.base);
  const b = await newUser(app.base);
  await add(a, '2026-10-13', 999);
  const r = await b.get('/api/expenses?week=2026-10-13');
  assert.deepEqual(r.data.expenses, []);
});

test('an invalid week returns 400 and no session returns 401', async () => {
  const u = await newUser(app.base);
  assert.equal((await u.get('/api/expenses?week=2026-02-30')).status, 400);
  assert.equal((await u.get('/api/expenses?week=last')).status, 400);
  assert.equal((await client(app.base).get('/api/expenses')).status, 401);
});
