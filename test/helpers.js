import { once } from 'node:events';
import net from 'node:net';

// Start a server on a random port and return a small fetch client.
export async function start(server) {
  server.listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    server,
    close: () => new Promise((r) => server.close(r)),
    get: (p, opts = {}) => fetch(base + p, opts),
  };
}

// Send a raw request line (fetch normalises "../" away, raw sockets do not).
export function rawGet(base, p) {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, hostname, () => sock.write(`GET ${p} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
    let buf = '';
    sock.on('data', (d) => (buf += d));
    sock.on('end', () => resolve({ status: Number(buf.split(' ')[1]), body: buf }));
    sock.on('error', reject);
  });
}

// JSON API client that remembers the session cookie, like a browser would.
export function client(base) {
  let cookie = '';
  const call = async (method, p, body) => {
    const res = await fetch(base + p, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0].endsWith('=') ? '' : setCookie.split(';')[0];
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null, setCookie };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b ?? {}),
    put: (p, b) => call('PUT', p, b ?? {}),
    del: (p) => call('DELETE', p),
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
  };
}

// Register a user and return a logged-in client.
let counter = 0;
export async function newUser(base, name = 'Student') {
  const c = client(base);
  const email = `user${++counter}_${Date.now()}@test.kz`;
  const r = await c.post('/api/register', { email, password: 'password123', name });
  c.user = r.data.user;
  return c;
}
