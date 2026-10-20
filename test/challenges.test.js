import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { today } from '../src/validate.js';
import { weekStart, addDays } from '../src/week.js';
import { status } from '../src/routes/challenges.js';
import { mondayOptions } from '../public/js/challenges.js';
import { start, client, newUser } from './helpers.js';

let app, db;
before(async () => { db = openDb(':memory:'); app = await start(createApp(db)); });
after(() => app.close());

const thisMonday = weekStart(today());
const body = (over = {}) => ({ name: 'No-taxi November', startWeek: thisMonday, weeks: 2, budget: 20000, ...over });

test('POST /api/challenges returns 201 with the challenge and an invite token', async () => {
  const u = await newUser(app.base);
  const r = await u.post('/api/challenges', body());
  assert.equal(r.status, 201);
  const c = r.data.challenge;
  assert.equal(c.name, 'No-taxi November');
  assert.equal(c.startWeek, thisMonday);
  assert.equal(c.weeks, 2);
  assert.equal(c.endDate, addDays(thisMonday, 13));
  assert.equal(c.status, 'active');
  assert.equal(c.participantCount, 1);
  assert.match(c.inviteToken, /^[A-Za-z0-9_-]{22,}$/);
});

test('the creator is a participant with their own budget', async () => {
  const u = await newUser(app.base);
  const c = (await u.post('/api/challenges', body({ budget: 15000 }))).data.challenge;
  const p = db.prepare('SELECT user_id, budget FROM participants WHERE challenge_id = ?').all(c.id);
  assert.deepEqual(p.map((x) => ({ ...x })), [{ user_id: u.user.id, budget: 15000 }]);
});

test('name is trimmed and must be 1–60 characters', async () => {
  const u = await newUser(app.base);
  assert.equal((await u.post('/api/challenges', body({ name: '   ' }))).status, 400);
  assert.equal((await u.post('/api/challenges', body({ name: 'x'.repeat(61) }))).status, 400);
  assert.equal((await u.post('/api/challenges', body({ name: '  Gym  ' }))).data.challenge.name, 'Gym');
});

test('startWeek must be a Monday, this week or later', async () => {
  const u = await newUser(app.base);
  assert.equal((await u.post('/api/challenges', body({ startWeek: addDays(thisMonday, 2) }))).status, 400, 'not a Monday');
  assert.equal((await u.post('/api/challenges', body({ startWeek: addDays(thisMonday, -7) }))).status, 400, 'past');
  assert.equal((await u.post('/api/challenges', body({ startWeek: '2026-02-30' }))).status, 400, 'invalid');
  const later = await u.post('/api/challenges', body({ startWeek: addDays(thisMonday, 14) }));
  assert.equal(later.status, 201);
  assert.equal(later.data.challenge.status, 'upcoming');
});

test('weeks must be 1–4 and budget a whole number 1–10 000 000', async () => {
  const u = await newUser(app.base);
  for (const weeks of [0, 5, 2.5, 'two']) assert.equal((await u.post('/api/challenges', body({ weeks }))).status, 400, String(weeks));
  for (const budget of [0, -1, 99.5, 10_000_001, undefined]) assert.equal((await u.post('/api/challenges', body({ budget }))).status, 400, String(budget));
  assert.equal((await u.post('/api/challenges', body({ weeks: 4, budget: 1 }))).status, 201);
});

test('invite tokens are unique and unguessable', async () => {
  const u = await newUser(app.base);
  const tokens = new Set();
  for (let i = 0; i < 20; i++) tokens.add((await u.post('/api/challenges', body())).data.challenge.inviteToken);
  assert.equal(tokens.size, 20);
});

test('GET /api/challenges lists only challenges the user takes part in', async () => {
  const a = await newUser(app.base);
  const b = await newUser(app.base);
  await a.post('/api/challenges', body({ name: 'A only' }));
  const list = (await a.get('/api/challenges')).data.challenges;
  assert.deepEqual(list.map((c) => c.name), ['A only']);
  assert.deepEqual(Object.keys(list[0]).sort(), ['endDate', 'id', 'inviteToken', 'name', 'participantCount', 'startWeek', 'status', 'weeks']);
  assert.deepEqual((await b.get('/api/challenges')).data.challenges, []);
});

test('status is upcoming, active or finished', () => {
  const c = { start_week: '2026-10-19', weeks: 2 };
  assert.equal(status(c, '2026-10-18'), 'upcoming');
  assert.equal(status(c, '2026-10-19'), 'active');
  assert.equal(status(c, '2026-11-01'), 'active');
  assert.equal(status(c, '2026-11-02'), 'finished');
});

test('the start-week picker offers this week\'s Monday and later Mondays only', () => {
  assert.deepEqual(mondayOptions('2026-10-21', 3), ['2026-10-19', '2026-10-26', '2026-11-02']);
  assert.deepEqual(mondayOptions('2026-10-25', 1), ['2026-10-19']);
});

test('both endpoints return 401 without a session', async () => {
  const anon = client(app.base);
  assert.equal((await anon.post('/api/challenges', body())).status, 401);
  assert.equal((await anon.get('/api/challenges')).status, 401);
});
