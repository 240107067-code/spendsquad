import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { score, weekStatus } from '../src/scoring.js';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { today } from '../src/validate.js';
import { weekStart } from '../src/week.js';
import { start, newUser } from './helpers.js';

const C = { start_week: '2026-10-05', weeks: 2 }; // weeks of 5 Oct and 12 Oct
const person = (userId, name, budget, totals) => ({
  userId, name, budget, weeks: totals.map((total, i) => ({ weekStart: i ? '2026-10-12' : '2026-10-05', total })),
});
const AFTER = '2026-10-30'; // both weeks finished

test('week status is upcoming, current or finished', () => {
  assert.equal(weekStatus('2026-10-19', '2026-10-18'), 'upcoming');
  assert.equal(weekStatus('2026-10-19', '2026-10-19'), 'current');
  assert.equal(weekStatus('2026-10-19', '2026-10-25'), 'current');
  assert.equal(weekStatus('2026-10-19', '2026-10-26'), 'finished');
});

test('single weekly winner is the lowest percent, results best first, one decimal', () => {
  const s = score(C, [person(1, 'Aru', 20000, [5000, 0]), person(2, 'Dana', 10000, [3000, 0])], AFTER);
  const w = s.weeks[0];
  assert.deepEqual(w.results.map((r) => [r.name, r.percent]), [['Aru', 25], ['Dana', 30]]);
  assert.deepEqual(w.winners, [1]);
  assert.equal(score(C, [person(1, 'A', 3, [1, 0])], AFTER).weeks[0].results[0].percent, 33.3);
});

test('an exact tie shares the win (500/1000 vs 1000/2000)', () => {
  const s = score(C, [person(1, 'Aru', 1000, [500, 0]), person(2, 'Dana', 2000, [1000, 0]), person(3, 'Erlan', 1000, [600, 0])], AFTER);
  assert.deepEqual(s.weeks[0].winners.sort(), [1, 2]);
});

test('zero spending is 0 % and can win; going over budget is allowed but scores worse', () => {
  const s = score(C, [person(1, 'Aru', 1000, [0, 0]), person(2, 'Dana', 1000, [1500, 0])], AFTER);
  assert.deepEqual(s.weeks[0].results.map((r) => r.percent), [0, 150]);
  assert.deepEqual(s.weeks[0].winners, [1]);
});

test('there are no winners for current or upcoming weeks', () => {
  const s = score(C, [person(1, 'Aru', 1000, [100, 0]), person(2, 'Dana', 1000, [900, 0])], '2026-10-08');
  assert.deepEqual(s.weeks.map((w) => w.status), ['current', 'upcoming']);
  assert.deepEqual(s.weeks.map((w) => w.winners), [[], []]);
  assert.equal(s.weeks[0].results[0].name, 'Aru', 'live leaderboard is still sorted');
});

test('overall winner has the most weekly wins once every week is finished', () => {
  const C3 = { start_week: '2026-10-05', weeks: 3 };
  const mk = (id, name, totals) => ({ userId: id, name, budget: 1000, weeks: totals.map((total) => ({ total })) });
  const s = score(C3, [mk(1, 'Aru', [100, 900, 100]), mk(2, 'Dana', [500, 100, 500])], '2026-11-01');
  assert.deepEqual(s.overall, { decided: true, winners: [1], wins: { 1: 2, 2: 1 } });
});

test('an overall tie is shared', () => {
  const s = score(C, [person(1, 'Aru', 1000, [100, 900]), person(2, 'Dana', 1000, [900, 100])], AFTER);
  assert.deepEqual(s.overall, { decided: true, winners: [1, 2], wins: { 1: 1, 2: 1 } });
});

test('the overall winner is not decided before the last week ends', () => {
  const s = score(C, [person(1, 'Aru', 1000, [100, 0]), person(2, 'Dana', 1000, [900, 0])], '2026-10-14');
  assert.equal(s.overall.decided, false);
  assert.deepEqual(s.overall.winners, []);
  assert.deepEqual(s.overall.wins, { 1: 1, 2: 0 }, 'wins so far are still counted');
});

let app;
before(async () => { app = await start(createApp(openDb(':memory:'))); });
after(() => app.close());

test('GET /api/challenges/:id includes standings sorted best first', async () => {
  const aru = await newUser(app.base, 'Aru');
  const dana = await newUser(app.base, 'Dana');
  const monday = weekStart(today());
  const c = (await aru.post('/api/challenges', { name: 'Battle', startWeek: monday, weeks: 1, budget: 10000 })).data.challenge;
  await dana.post(`/api/invites/${c.inviteToken}/join`, { budget: 4000 });
  await aru.post('/api/expenses', { amount: 5000, categoryId: 1, date: monday }); // 50 %
  await dana.post('/api/expenses', { amount: 1000, categoryId: 1, date: monday }); // 25 %
  const { standings } = (await aru.get(`/api/challenges/${c.id}`)).data;
  assert.equal(standings.weeks.length, 1);
  assert.equal(standings.weeks[0].status, 'current');
  assert.deepEqual(standings.weeks[0].results.map((r) => [r.name, r.percent]), [['Dana', 25], ['Aru', 50]]);
  assert.deepEqual(standings.weeks[0].winners, []);
  assert.equal(standings.overall.decided, false);
});
