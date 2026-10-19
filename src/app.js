import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, sendJson } from './http.js';

// Every file in src/routes/ default-exports (db) => [[method, path, handler], ...].
// New API modules are picked up automatically.
const ROUTES_DIR = new URL('./routes/', import.meta.url);
const ROUTE_MODULES = await Promise.all(
  fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.js')).sort()
    .map(async (f) => (await import(new URL(f, ROUTES_DIR))).default),
);

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return sendJson(res, 404, { error: 'Not found' });
  }
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(PUBLIC_DIR, '.' + pathname);
  // Never serve anything outside public/
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 404, { error: 'Not found' });
  fs.readFile(file, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

// '/api/expenses/:id' -> /^\/api\/expenses\/([^/]+)$/ with param names ['id']
function compile([method, pattern, handler]) {
  const names = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)')) + '$');
  return { method, re, names, handler };
}

// db: an open database from openDb().
export function createApp(db) {
  const routes = ROUTE_MODULES.flatMap((m) => m(db)).map(compile);

  async function handleApi(req, res, url) {
    if (url.pathname === '/api/health' && req.method === 'GET') return sendJson(res, 200, { status: 'ok' });
    for (const r of routes) {
      const m = r.method === req.method && url.pathname.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      const [status, data, headers] = await r.handler({ req, params, query: url.searchParams });
      return sendJson(res, status, data, headers);
    }
    return sendJson(res, 404, { error: 'Not found' });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      try {
        await handleApi(req, res, url);
      } catch (e) {
        if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message });
        console.error(e);
        sendJson(res, 500, { error: 'Something went wrong' });
      }
      return;
    }
    if (req.method !== 'GET') return sendJson(res, 404, { error: 'Not found' });
    serveStatic(req, res);
  });
}
