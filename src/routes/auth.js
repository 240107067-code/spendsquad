import crypto from 'node:crypto';
import { fail, readJson, requireUser, parseCookies, SESSION_COOKIE, sessionCookie, clearedSessionCookie } from '../http.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_FAILED = 'Wrong email or password';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });

function startSession(db, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return { 'Set-Cookie': sessionCookie(token) };
}

export default function authRoutes(db) {
  return [
    ['POST', '/api/register', async ({ req }) => {
      const body = await readJson(req);
      const email = String(body.email ?? '').trim().toLowerCase();
      const name = String(body.name ?? '').trim();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!EMAIL_RE.test(email) || email.length > 254) fail(400, 'Please enter a valid email');
      if (!name || name.length > 40) fail(400, 'Name must be 1–40 characters');
      if (password.length < 8) fail(400, 'Password must be at least 8 characters');
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) fail(409, 'An account with this email already exists');
      const { lastInsertRowid } = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
        .run(email, name, hashPassword(password));
      const user = { id: Number(lastInsertRowid), email, name };
      return [201, { user }, startSession(db, user.id)];
    }],

    ['POST', '/api/login', async ({ req }) => {
      const body = await readJson(req);
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !verifyPassword(password, user.password_hash)) fail(401, LOGIN_FAILED);
      return [200, { user: publicUser(user) }, startSession(db, user.id)];
    }],

    ['POST', '/api/logout', async ({ req }) => {
      const token = parseCookies(req)[SESSION_COOKIE];
      if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return [204, null, { 'Set-Cookie': clearedSessionCookie() }];
    }],

    ['GET', '/api/me', async ({ req }) => [200, { user: publicUser(requireUser(req, db)) }]],
  ];
}
