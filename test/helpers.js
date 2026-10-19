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
