import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { start, client, newUser } from './helpers.js';

let app;
before(async () => { app = await start(createApp(openDb(':memory:'))); });
after(() => app.close());

test('a new user sees the five default categories in order', async () => {
  const u = await newUser(app.base);
  const r = await u.get('/api/categories');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.categories.map((c) => c.name), ['Food', 'Transport', 'Study', 'Entertainment', 'Other']);
  assert.ok(r.data.categories.every((c) => c.isDefault === true && Number.isInteger(c.id)));
});

test('creating a custom category returns 201 and it follows the defaults', async () => {
  const u = await newUser(app.base);
  const r = await u.post('/api/categories', { name: '  Coffee  ' });
  assert.equal(r.status, 201);
  assert.deepEqual(Object.keys(r.data.category).sort(), ['id', 'isDefault', 'name']);
  assert.equal(r.data.category.name, 'Coffee');
  assert.equal(r.data.category.isDefault, false);
  await u.post('/api/categories', { name: 'Books' });
  const names = (await u.get('/api/categories')).data.categories.map((c) => c.name);
  assert.deepEqual(names.slice(5), ['Books', 'Coffee']);
});

test('empty or too long names return 400', async () => {
  const u = await newUser(app.base);
  for (const name of ['', '   ', 'x'.repeat(31), undefined]) {
    assert.equal((await u.post('/api/categories', { name })).status, 400, String(name));
  }
  assert.equal((await u.post('/api/categories', { name: 'x'.repeat(30) })).status, 201);
});

test('a name equal to a default or an own category in any case returns 409', async () => {
  const u = await newUser(app.base);
  assert.equal((await u.post('/api/categories', { name: 'food' })).status, 409);
  assert.equal((await u.post('/api/categories', { name: 'Gym' })).status, 201);
  assert.equal((await u.post('/api/categories', { name: 'GYM' })).status, 409);
});

test('users never see each other\'s categories and may reuse a name', async () => {
  const a = await newUser(app.base);
  const b = await newUser(app.base);
  await a.post('/api/categories', { name: 'Secret' });
  assert.ok(!(await b.get('/api/categories')).data.categories.some((c) => c.name === 'Secret'));
  assert.equal((await b.post('/api/categories', { name: 'Secret' })).status, 201);
});

test('both endpoints return 401 without a session', async () => {
  const anon = client(app.base);
  assert.equal((await anon.get('/api/categories')).status, 401);
  assert.equal((await anon.post('/api/categories', { name: 'X' })).status, 401);
});
