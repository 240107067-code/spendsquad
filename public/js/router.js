// Pure hash-route parsing — no DOM, so it is unit-tested in Node.
const ROUTES = [
  ['login', /^\/login$/, []],
  ['register', /^\/register$/, []],
  ['expenses', /^\/expenses$/, []],
  ['challenges', /^\/challenges$/, []],
  ['challenge', /^\/challenges\/(\d+)$/, ['id']],
  ['invite', /^\/invite\/([A-Za-z0-9_-]+)$/, ['token']],
];

export const PUBLIC_ROUTES = new Set(['login', 'register']);

// '#/challenges/7?week=2026-10-19' -> { name: 'challenge', params: { id: '7' }, query: { week: '2026-10-19' }, hash }
export function parseRoute(hash = '') {
  const raw = hash.replace(/^#/, '') || '/expenses';
  const [path, qs = ''] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  for (const [name, re, keys] of ROUTES) {
    const m = path.match(re);
    if (m) return { name, params: Object.fromEntries(keys.map((k, i) => [k, m[i + 1]])), query, hash: '#' + raw };
  }
  return { name: 'expenses', params: {}, query: {}, hash: '#/expenses', unknown: true };
}

// Only allow redirects to our own hash routes (no open redirect via ?next=).
export function safeNext(next) {
  return typeof next === 'string' && next.startsWith('#/') ? next : '#/expenses';
}

export function loginRedirect(currentHash) {
  return '#/login?next=' + encodeURIComponent(safeNext(currentHash || '#/expenses'));
}
