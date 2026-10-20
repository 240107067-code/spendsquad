import crypto from 'node:crypto';
import { fail, readJson, requireUser } from '../http.js';
import { isIsoDate, today, wholeNumber, MAX_AMOUNT } from '../validate.js';
import { weekStart, isMonday, addDays } from '../week.js';

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
  ];
}
