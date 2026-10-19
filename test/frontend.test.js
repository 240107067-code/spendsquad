import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, safeNext, loginRedirect, PUBLIC_ROUTES } from '../public/js/router.js';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { start } from './helpers.js';

test('parseRoute recognises every app route', () => {
  assert.equal(parseRoute('#/login').name, 'login');
  assert.equal(parseRoute('#/register').name, 'register');
  assert.equal(parseRoute('#/expenses').name, 'expenses');
  assert.equal(parseRoute('#/challenges').name, 'challenges');
  assert.deepEqual(parseRoute('#/challenges/42').params, { id: '42' });
  assert.equal(parseRoute('#/challenges/42').name, 'challenge');
  assert.deepEqual(parseRoute('#/invite/aB3_-x').params, { token: 'aB3_-x' });
});

test('parseRoute reads the query string', () => {
  const r = parseRoute('#/login?next=%23%2Fchallenges%2F3');
  assert.equal(r.name, 'login');
  assert.equal(r.query.next, '#/challenges/3');
});

test('an empty or unknown hash falls back to expenses', () => {
  assert.equal(parseRoute('').name, 'expenses');
  assert.equal(parseRoute('#/').name, 'expenses');
  assert.equal(parseRoute('#/nope/what').name, 'expenses');
  assert.equal(parseRoute('#/challenges/abc').name, 'expenses');
});

test('login redirect keeps the page and only allows internal next targets', () => {
  assert.equal(loginRedirect('#/invite/tok'), '#/login?next=%23%2Finvite%2Ftok');
  assert.equal(safeNext('#/challenges/1'), '#/challenges/1');
  assert.equal(safeNext('https://evil.example'), '#/expenses');
  assert.equal(safeNext(undefined), '#/expenses');
  assert.ok(PUBLIC_ROUTES.has('login') && PUBLIC_ROUTES.has('register') && !PUBLIC_ROUTES.has('expenses'));
});

let app;
before(async () => { app = await start(createApp(openDb(':memory:'))); });
after(() => app.close());

test('the app shell files are served with the right content type', async () => {
  for (const [p, type] of [['/', /text\/html/], ['/styles.css', /text\/css/], ['/js/main.js', /javascript/], ['/js/router.js', /javascript/]]) {
    const res = await app.get(p);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get('content-type'), type, p);
  }
});

test('index.html has a viewport meta tag and loads the module', async () => {
  const html = await (await app.get('/')).text();
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<script type="module" src="\/js\/main.js">/);
  assert.match(html, /href="\/styles.css"/);
});

test('frontend code never assigns innerHTML', async () => {
  for (const f of ['main', 'dom', 'auth', 'api', 'router', 'expenses', 'challenges', 'categories']) {
    const src = await (await app.get(`/js/${f}.js`)).text();
    assert.doesNotMatch(src, /innerHTML/, f);
  }
});
