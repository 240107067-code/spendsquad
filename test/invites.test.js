import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { today } from '../src/validate.js';
import { weekStart } from '../src/week.js';
import { start, client, newUser } from './helpers.js';

let app, db;
before(async () => { db = openDb(':memory:'); app = await start(createApp(db)); });
after(() => app.close());

async function newChallenge(owner, over = {}) {
  const r = await owner.post('/api/challenges', { name: 'Budget battle', startWeek: weekStart(today()), weeks: 2, budget: 20000, ...over });
  return r.data.challenge;
}

test('GET /api/invites/:token shows the challenge and whether I joined', async () => {
  const owner = await newUser(app.base);
  const friend = await newUser(app.base);
  const c = await newChallenge(owner);
  const r = await friend.get(`/api/invites/${c.inviteToken}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.joined, false);
  assert.deepEqual(Object.keys(r.data.challenge).sort(), ['endDate', 'id', 'name', 'participantCount', 'startWeek', 'status', 'weeks']);
  assert.equal(r.data.challenge.participantCount, 1);
  assert.equal((await owner.get(`/api/invites/${c.inviteToken}`)).data.joined, true);
});

test('an unknown token returns 404', async () => {
  const u = await newUser(app.base);
  assert.equal((await u.get('/api/invites/not-a-real-token')).status, 404);
  assert.equal((await u.post('/api/invites/not-a-real-token/join', { budget: 1000 })).status, 404);
});

test('joining adds the user with their own budget and returns 201', async () => {
  const owner = await newUser(app.base);
  const friend = await newUser(app.base);
  const c = await newChallenge(owner);
  const r = await friend.post(`/api/invites/${c.inviteToken}/join`, { budget: 12000 });
  assert.equal(r.status, 201);
  assert.deepEqual(r.data, { challengeId: c.id });
  const row = db.prepare('SELECT budget FROM participants WHERE challenge_id = ? AND user_id = ?').get(c.id, friend.user.id);
  assert.equal(row.budget, 12000);
  assert.ok((await friend.get('/api/challenges')).data.challenges.some((x) => x.id === c.id));
});

test('budget must be a whole number from 1 to 10 000 000', async () => {
  const owner = await newUser(app.base);
  const friend = await newUser(app.base);
  const c = await newChallenge(owner);
  for (const budget of [0, -1, 1.5, 'lots', undefined, 10_000_001]) {
    assert.equal((await friend.post(`/api/invites/${c.inviteToken}/join`, { budget })).status, 400, String(budget));
  }
});

test('joining twice returns 409 and keeps one row', async () => {
  const owner = await newUser(app.base);
  const friend = await newUser(app.base);
  const c = await newChallenge(owner);
  await friend.post(`/api/invites/${c.inviteToken}/join`, { budget: 5000 });
  assert.equal((await friend.post(`/api/invites/${c.inviteToken}/join`, { budget: 9000 })).status, 409);
  assert.equal((await owner.post(`/api/invites/${c.inviteToken}/join`, { budget: 9000 })).status, 409, 'creator is already in');
  const n = db.prepare('SELECT COUNT(*) AS n FROM participants WHERE challenge_id = ? AND user_id = ?').get(c.id, friend.user.id).n;
  assert.equal(n, 1);
});

test('joining after the last day returns 410', async () => {
  const owner = await newUser(app.base);
  const friend = await newUser(app.base);
  const c = await newChallenge(owner);
  db.prepare("UPDATE challenges SET start_week = '2026-01-05', weeks = 1 WHERE id = ?").run(c.id); // ended long ago
  const r = await friend.post(`/api/invites/${c.inviteToken}/join`, { budget: 5000 });
  assert.equal(r.status, 410);
  assert.equal((await friend.get(`/api/invites/${c.inviteToken}`)).data.challenge.status, 'finished');
});

test('there is no participant limit', async () => {
  const owner = await newUser(app.base);
  const c = await newChallenge(owner);
  for (let i = 0; i < 5; i++) {
    const u = await newUser(app.base);
    assert.equal((await u.post(`/api/invites/${c.inviteToken}/join`, { budget: 1000 + i })).status, 201);
  }
  assert.equal((await owner.get(`/api/invites/${c.inviteToken}`)).data.challenge.participantCount, 6);
});

test('a late joiner can join an active challenge', async () => {
  const owner = await newUser(app.base);
  const friend = await newUser(app.base);
  const c = await newChallenge(owner, { weeks: 4 });
  assert.equal(c.status, 'active');
  assert.equal((await friend.post(`/api/invites/${c.inviteToken}/join`, { budget: 3000 })).status, 201);
});

test('both invite endpoints return 401 without a session', async () => {
  const owner = await newUser(app.base);
  const c = await newChallenge(owner);
  const anon = client(app.base);
  assert.equal((await anon.get(`/api/invites/${c.inviteToken}`)).status, 401);
  assert.equal((await anon.post(`/api/invites/${c.inviteToken}/join`, { budget: 1000 })).status, 401);
});
