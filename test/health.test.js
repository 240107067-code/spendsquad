import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { start, rawGet } from './helpers.js';

let app;
before(async () => { app = await start(createApp(openDb(':memory:'))); });
after(() => app.close());

test('GET /api/health returns 200 with status ok', async () => {
  const res = await app.get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET / serves public/index.html as html', async () => {
  const res = await app.get('/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /SpendSquad/);
});

test('a missing static file returns 404', async () => {
  const res = await app.get('/nope.css');
  assert.equal(res.status, 404);
});

test('path traversal never leaves public/', async () => {
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2f%2e%2e%2fetc/passwd']) {
    const res = await rawGet(app.base, p);
    assert.equal(res.status, 404, p);
    assert.doesNotMatch(res.body, /"name": "spendsquad"/, p);
  }
});

test('an unknown /api route returns JSON 404', async () => {
  const res = await app.get('/api/nothing');
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});

test('package.json has no dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.type, 'module');
});
