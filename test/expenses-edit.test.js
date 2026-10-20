import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { today } from '../src/validate.js';
import { start, client, newUser } from './helpers.js';

let app, db;
before(async () => { db = openDb(':memory:'); app = await start(createApp(db)); });
after(() => app.close());

const body = (over = {}) => ({ amount: 1500, categoryId: 1, note: 'lunch', date: today(), ...over });
const create = async (u, over) => (await u.post('/api/expenses', body(over))).data.expense;

test('PUT updates the expense and marks it edited', async () => {
  const u = await newUser(app.base);
  const e = await create(u);
  assert.equal(e.edited, false);
  const r = await u.put(`/api/expenses/${e.id}`, body({ amount: 2000, categoryId: 2, note: 'bus' }));
  assert.equal(r.status, 200);
  assert.equal(r.data.expense.amount, 2000);
  assert.equal(r.data.expense.categoryName, 'Transport');
  assert.equal(r.data.expense.note, 'bus');
  assert.equal(r.data.expense.edited, true);
});

test('PUT uses the same validation as create', async () => {
  const u = await newUser(app.base);
  const e = await create(u);
  assert.equal((await u.put(`/api/expenses/${e.id}`, body({ amount: 0 }))).status, 400);
  assert.equal((await u.put(`/api/expenses/${e.id}`, body({ date: '2026-02-30' }))).status, 400);
  assert.equal((await u.put(`/api/expenses/${e.id}`, body({ note: 'x'.repeat(201) }))).status, 400);
  const tomorrow = today(new Date(Date.now() + 36 * 3600 * 1000));
  assert.equal((await u.put(`/api/expenses/${e.id}`, body({ date: tomorrow }))).status, 400);
});

test('a PUT that changes nothing still marks the expense edited and bumps updated_at', async () => {
  const u = await newUser(app.base);
  const e = await create(u);
  const before = db.prepare('SELECT updated_at FROM expenses WHERE id = ?').get(e.id).updated_at;
  await new Promise((r) => setTimeout(r, 20));
  const r = await u.put(`/api/expenses/${e.id}`, body());
  assert.equal(r.data.expense.edited, true);
  const after = db.prepare('SELECT updated_at FROM expenses WHERE id = ?').get(e.id).updated_at;
  assert.notEqual(after, before);
});

test('GET /api/expenses returns the edited flag', async () => {
  const u = await newUser(app.base);
  const a = await create(u, { note: 'a' });
  await create(u, { note: 'b' });
  await u.put(`/api/expenses/${a.id}`, body({ note: 'a2' }));
  const list = (await u.get('/api/expenses')).data.expenses;
  assert.deepEqual(list.map((e) => [e.note, e.edited]).sort(), [['a2', true], ['b', false]]);
});

test('DELETE removes the expense from the weekly view', async () => {
  const u = await newUser(app.base);
  const e = await create(u);
  const r = await u.del(`/api/expenses/${e.id}`);
  assert.equal(r.status, 204);
  assert.deepEqual((await u.get('/api/expenses')).data.expenses, []);
  assert.equal((await u.del(`/api/expenses/${e.id}`)).status, 404, 'already deleted');
});

test('another user\'s expense returns 404 for edit and delete and stays unchanged', async () => {
  const owner = await newUser(app.base);
  const other = await newUser(app.base);
  const e = await create(owner, { amount: 777 });
  assert.equal((await other.put(`/api/expenses/${e.id}`, body({ amount: 1 }))).status, 404);
  assert.equal((await other.del(`/api/expenses/${e.id}`)).status, 404);
  const mine = (await owner.get('/api/expenses')).data.expenses[0];
  assert.equal(mine.amount, 777);
  assert.equal(mine.edited, false);
});

test('unknown and non-numeric ids return 404', async () => {
  const u = await newUser(app.base);
  assert.equal((await u.put('/api/expenses/999999', body())).status, 404);
  assert.equal((await u.del('/api/expenses/abc')).status, 404);
  assert.equal((await u.put('/api/expenses/1.5', body())).status, 404);
});

test('edit and delete return 401 without a session', async () => {
  const anon = client(app.base);
  assert.equal((await anon.put('/api/expenses/1', body())).status, 401);
  assert.equal((await anon.del('/api/expenses/1')).status, 401);
});
