// Small HTTP helpers shared by all API routes.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const fail = (status, message) => { throw new HttpError(status, message); };

export function sendJson(res, status, data, headers = {}) {
  if (status === 204) {
    res.writeHead(204, headers);
    return res.end();
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(data));
}

export async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) fail(413, 'Request body too large');
  }
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    if (data === null || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Request body must be a JSON object');
    return data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    fail(400, 'Invalid JSON');
  }
}

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const SESSION_COOKIE = 'sid';

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

// The logged-in user for this request, or null.
export function currentUser(req, db) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  return db.prepare(
    'SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
  ).get(token) || null;
}

// The logged-in user, or a 401 error. Every protected route starts with this.
export function requireUser(req, db) {
  return currentUser(req, db) || fail(401, 'Please log in');
}
