import crypto from 'node:crypto';
import { fail, readJson, requireUser } from '../http.js';
import { isIsoDate, today, wholeNumber, MAX_AMOUNT } from '../validate.js';
import { weekStart, isMonday, addDays } from '../week.js';
import { expensesBetween } from './expenses.js';

export const endDate = (c) => addDays(c.start_week, c.weeks * 7 - 1);

export function status(c, todayStr = today()) {
  if (todayStr < c.start_week) return 'upcoming';
  if (todayStr > endDate(c)) return 'finished';
  return 'active';
}

const participantCount = (db, id) => db.prepare('SELECT COUNT(*) AS n FROM participants WHERE challenge_id = ?').get(id).n;

export function challengeToApi(db, c, { withToken = false } = {}) {
  return {
    id: c.id,
    name: c.name,
    startWeek: c.start_week,
    weeks: c.weeks,
    endDate: endDate(c),
    participantCount: participantCount(db, c.id),
    status: status(c),
    ...(withToken ? { inviteToken: c.invite_token } : {}),
  };
}

export function budgetInput(value) {
  const budget = wholeNumber(value, 1, MAX_AMOUNT);
  if (budget === null) fail(400, 'Weekly budget must be a whole number from 1 to 10 000 000 ₸');
  return budget;
}

const byToken = (db, token) => db.prepare('SELECT * FROM challenges WHERE invite_token = ?').get(token) || fail(404, 'This invite link is not valid');
const isParticipant = (db, challengeId, userId) =>
  !!db.prepare('SELECT 1 FROM participants WHERE challenge_id = ? AND user_id = ?').get(challengeId, userId);

// Full transparency (plan.md): every participant sees every expense of every other
// participant inside the challenge weeks — but only display names, never emails.
export function challengeDetail(db, c) {
  const weekStarts = Array.from({ length: c.weeks }, (_, i) => addDays(c.start_week, i * 7));
  const people = db.prepare(
    'SELECT u.id, u.name, p.budget FROM participants p JOIN users u ON u.id = p.user_id WHERE p.challenge_id = ? ORDER BY p.joined_at, u.id',
  ).all(c.id);
  return people.map((p) => ({
    userId: p.id,
    name: p.name,
    budget: p.budget,
    weeks: weekStarts.map((ws) => {
      const expenses = expensesBetween(db, p.id, ws, addDays(ws, 6))
        .map(({ amount, categoryName, note, date, edited }) => ({ amount, categoryName, note, date, edited }));
      return { weekStart: ws, total: expenses.reduce((sum, e) => sum + e.amount, 0), expenses };
    }),
  }));
}

export default function challengeRoutes(db) {
  return [
    ['POST', '/api/challenges', async ({ req }) => {
      const user = requireUser(req, db);
      const body = await readJson(req);
      const name = String(body.name ?? '').trim();
      if (!name || name.length > 60) fail(400, 'Challenge name must be 1–60 characters');
      const start = body.startWeek;
      if (!isIsoDate(start) || !isMonday(start)) fail(400, 'Start week must be a Monday (YYYY-MM-DD)');
      if (start < weekStart(today())) fail(400, 'Start week cannot be in the past');
      const weeks = wholeNumber(body.weeks, 1, 4);
      if (weeks === null) fail(400, 'A challenge lasts 1 to 4 weeks');
      const budget = budgetInput(body.budget);

      const token = crypto.randomBytes(18).toString('base64url');
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO challenges (name, creator_id, start_week, weeks, invite_token) VALUES (?, ?, ?, ?, ?)',
      ).run(name, user.id, start, weeks, token);
      db.prepare('INSERT INTO participants (challenge_id, user_id, budget) VALUES (?, ?, ?)').run(lastInsertRowid, user.id, budget);
      const c = db.prepare('SELECT * FROM challenges WHERE id = ?').get(lastInsertRowid);
      return [201, { challenge: challengeToApi(db, c, { withToken: true }) }];
    }],

    ['GET', '/api/challenges', async ({ req }) => {
      const user = requireUser(req, db);
      const rows = db.prepare(
        'SELECT c.* FROM challenges c JOIN participants p ON p.challenge_id = c.id WHERE p.user_id = ? ORDER BY c.start_week DESC, c.id DESC',
      ).all(user.id);
      return [200, { challenges: rows.map((c) => challengeToApi(db, c, { withToken: true })) }];
    }],

    ['GET', '/api/challenges/:id', async ({ req, params }) => {
      const user = requireUser(req, db);
      const c = /^\d+$/.test(params.id) && db.prepare('SELECT * FROM challenges WHERE id = ?').get(Number(params.id));
      // Non-participants get the same 404 as a missing challenge, so ids cannot be probed.
      if (!c || !isParticipant(db, c.id, user.id)) fail(404, 'Challenge not found');
      return [200, { challenge: challengeToApi(db, c, { withToken: true }), participants: challengeDetail(db, c) }];
    }],

    ['GET', '/api/invites/:token', async ({ req, params }) => {
      const user = requireUser(req, db);
      const c = byToken(db, params.token);
      return [200, { challenge: challengeToApi(db, c), joined: isParticipant(db, c.id, user.id) }];
    }],

    // No participant limit (plan.md). Late joiners are welcome until the last day:
    // expenses belong to users, so they are scored for every week (decisions.md item 7).
    ['POST', '/api/invites/:token/join', async ({ req, params }) => {
      const user = requireUser(req, db);
      const c = byToken(db, params.token);
      if (status(c) === 'finished') fail(410, 'This challenge has ended');
      if (isParticipant(db, c.id, user.id)) fail(409, 'You are already in this challenge');
      const budget = budgetInput((await readJson(req)).budget);
      db.prepare('INSERT INTO participants (challenge_id, user_id, budget) VALUES (?, ?, ?)').run(c.id, user.id, budget);
      return [201, { challengeId: c.id }];
    }],
  ];
}
