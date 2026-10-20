import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { today } from '../src/validate.js';
import { weekStart, addDays } from '../src/week.js';
import { pickWeek } from '../public/js/challenges.js';
import { start, client, newUser } from './helpers.js';

let app, db;
before(async () => { db = openDb(':memory:'); app = await start(createApp(db)); });
after(() => app.close());

const monday = weekStart(today());

async function setup() {
  const aru = await newUser(app.base, 'Aru');
  const dana = await newUser(app.base, 'Dana');
  const c = (await aru.post('/api/challenges', { name: 'Battle', startWeek: monday, weeks: 2, budget: 20000 })).data.challenge;
  await dana.post(`/api/invites/${c.inviteToken}/join`, { budget: 10000 });
  return { aru, dana, c };
}

test('every participant sees every participant\'s expenses for the challenge weeks', async () => {
  const { aru, dana, c } = await setup();
  await aru.post('/api/expenses', { amount: 1500, categoryId: 1, note: 'lunch', date: monday });
  await dana.post('/api/expenses', { amount: 900, categoryId: 2, note: 'bus', date: monday });
  for (const viewer of [aru, dana]) {
    const r = await viewer.get(`/api/challenges/${c.id}`);
    assert.equal(r.status, 200);
    assert.equal(r.data.challenge.id, c.id);
    const byName = Object.fromEntries(r.data.participants.map((p) => [p.name, p]));
    assert.deepEqual(Object.keys(byName).sort(), ['Aru', 'Dana']);
    assert.equal(byName.Aru.budget, 20000);
    assert.equal(byName.Dana.budget, 10000);
    assert.deepEqual(byName.Aru.weeks[0].expenses, [{ amount: 1500, categoryName: 'Food', note: 'lunch', date: monday, edited: false }]);
    assert.deepEqual(byName.Dana.weeks[0].expenses, [{ amount: 900, categoryName: 'Transport', note: 'bus', date: monday, edited: false }]);
    assert.equal(byName.Dana.weeks[0].total, 900);
  }
});

test('weeks are listed in order and future weeks are empty', async () => {
  const { aru, c } = await setup();
  const p = (await aru.get(`/api/challenges/${c.id}`)).data.participants[0];
  assert.deepEqual(p.weeks.map((w) => w.weekStart), [monday, addDays(monday, 7)]);
  assert.deepEqual(p.weeks[1], { weekStart: addDays(monday, 7), total: 0, expenses: [] });
});

test('only expenses inside the challenge weeks are included', async () => {
  const { aru, c } = await setup();
  await aru.post('/api/expenses', { amount: 111, categoryId: 1, date: addDays(monday, -1) }); // day before start
  await aru.post('/api/expenses', { amount: 222, categoryId: 1, date: monday });
  const p = (await aru.get(`/api/challenges/${c.id}`)).data.participants.find((x) => x.name === 'Aru');
  assert.deepEqual(p.weeks.flatMap((w) => w.expenses.map((e) => e.amount)), [222]);
});

test('an edit made through PUT /api/expenses/:id shows up as edited', async () => {
  const { aru, dana, c } = await setup();
  const e = (await aru.post('/api/expenses', { amount: 1000, categoryId: 1, date: monday })).data.expense;
  await aru.put(`/api/expenses/${e.id}`, { amount: 500, categoryId: 1, date: monday });
  const p = (await dana.get(`/api/challenges/${c.id}`)).data.participants.find((x) => x.name === 'Aru');
  assert.deepEqual(p.weeks[0].expenses.map((x) => [x.amount, x.edited]), [[500, true]]);
});

test('emails are never included', async () => {
  const { dana, c } = await setup();
  const text = JSON.stringify((await dana.get(`/api/challenges/${c.id}`)).data);
  assert.doesNotMatch(text, /@test\.kz/);
});

test('non-participants, unknown ids and anonymous users cannot see it', async () => {
  const { c } = await setup();
  const stranger = await newUser(app.base);
  assert.equal((await stranger.get(`/api/challenges/${c.id}`)).status, 404);
  assert.equal((await stranger.get('/api/challenges/999999')).status, 404);
  assert.equal((await stranger.get('/api/challenges/abc')).status, 404);
  assert.equal((await client(app.base).get(`/api/challenges/${c.id}`)).status, 401);
});

test('pickWeek chooses ?week, else the current week, else the first', () => {
  const weeks = ['2026-10-19', '2026-10-26', '2026-11-02'];
  assert.equal(pickWeek(weeks, '2026-10-26', '2026-10-20'), '2026-10-26');
  assert.equal(pickWeek(weeks, 'bogus', '2026-10-28'), '2026-10-26');
  assert.equal(pickWeek(weeks, undefined, '2026-10-01'), '2026-10-19');
  assert.equal(pickWeek(weeks, undefined, '2026-12-25'), '2026-11-02');
});
