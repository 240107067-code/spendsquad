import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { start, client } from './helpers.js';

let app, db;
before(async () => { db = openDb(':memory:'); app = await start(createApp(db)); });
after(() => app.close());

const reg = (c, over = {}) => c.post('/api/register', { email: 'aru@sdu.kz', password: 'password123', name: 'Aru', ...over });

test('register creates the user, logs them in and returns 201', async () => {
  const c = client(app.base);
  const r = await reg(c);
  assert.equal(r.status, 201);
  assert.deepEqual(Object.keys(r.data.user).sort(), ['email', 'id', 'name']);
  assert.equal(r.data.user.email, 'aru@sdu.kz');
  const me = await c.get('/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.user.name, 'Aru');
});

test('the session cookie is HttpOnly, SameSite=Lax, Path=/', async () => {
  const r = await reg(client(app.base), { email: 'cookie@sdu.kz' });
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /SameSite=Lax/);
  assert.match(r.setCookie, /Path=\//);
});

test('email is trimmed and lower-cased', async () => {
  const r = await reg(client(app.base), { email: '  MiXeD@SDU.KZ ' });
  assert.equal(r.data.user.email, 'mixed@sdu.kz');
});

test('invalid email returns 400', async () => {
  for (const email of ['', 'no-at-sign', 'a@b', 'a b@c.kz']) {
    const r = await reg(client(app.base), { email });
    assert.equal(r.status, 400, email);
    assert.ok(r.data.error);
  }
});

test('password shorter than 8 characters returns 400', async () => {
  const r = await reg(client(app.base), { email: 'short@sdu.kz', password: '1234567' });
  assert.equal(r.status, 400);
});

test('name is required and at most 40 characters', async () => {
  assert.equal((await reg(client(app.base), { email: 'n1@sdu.kz', name: '   ' })).status, 400);
  assert.equal((await reg(client(app.base), { email: 'n2@sdu.kz', name: 'x'.repeat(41) })).status, 400);
  assert.equal((await reg(client(app.base), { email: 'n3@sdu.kz', name: '  Dana  ' })).data.user.name, 'Dana');
});

test('registering an existing email in any case returns 409', async () => {
  await reg(client(app.base), { email: 'dup@sdu.kz' });
  const r = await reg(client(app.base), { email: 'DUP@sdu.kz' });
  assert.equal(r.status, 409);
});

test('login with correct credentials returns 200 and sets a cookie', async () => {
  await reg(client(app.base), { email: 'login@sdu.kz' });
  const c = client(app.base);
  const r = await c.post('/api/login', { email: 'Login@sdu.kz', password: 'password123' });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.email, 'login@sdu.kz');
  assert.match(r.setCookie, /^sid=/);
  assert.equal((await c.get('/api/me')).status, 200);
});

test('wrong password and unknown email give the same 401', async () => {
  await reg(client(app.base), { email: 'pw@sdu.kz' });
  const wrong = await client(app.base).post('/api/login', { email: 'pw@sdu.kz', password: 'nope-nope' });
  const unknown = await client(app.base).post('/api/login', { email: 'ghost@sdu.kz', password: 'password123' });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.data.error, unknown.data.error);
});

test('GET /api/me without a session returns 401', async () => {
  assert.equal((await client(app.base).get('/api/me')).status, 401);
});

test('logout deletes the session and the old cookie stops working', async () => {
  const c = client(app.base);
  await reg(c, { email: 'bye@sdu.kz' });
  const oldCookie = c.cookie;
  const r = await c.post('/api/logout');
  assert.equal(r.status, 204);
  assert.match(r.setCookie, /Max-Age=0/);
  const token = oldCookie.split('=')[1];
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token = ?').get(token).n, 0);
  const again = client(app.base);
  again.cookie = oldCookie;
  assert.equal((await again.get('/api/me')).status, 401);
});

test('the password is never stored in plain text or returned', async () => {
  const r = await reg(client(app.base), { email: 'secret@sdu.kz', password: 'my-secret-pass' });
  assert.ok(!JSON.stringify(r.data).includes('my-secret-pass'));
  const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('secret@sdu.kz');
  assert.ok(!row.password_hash.includes('my-secret-pass'));
  assert.match(row.password_hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
});

test('malformed JSON returns 400 instead of crashing', async () => {
  const r = await client(app.base).post('/api/register', '{"email": ');
  assert.equal(r.status, 400);
  assert.equal((await client(app.base).get('/api/health')).status, 200);
});
