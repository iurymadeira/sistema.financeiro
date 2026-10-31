// Sobe o app de verdade numa porta livre, em cima de um banco isolado, e entrega um cliente HTTP simples.
const { migrate } = require('../../src/db/migrate');
const { createApp } = require('../../src/app');
const { freshPool } = require('./db');

async function startApp(options = {}) {
  const { pool, drop } = await freshPool();
  await migrate(pool);
  const server = createApp({ pool, ...options }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  async function request(method, path, body, { raw } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: body === undefined && raw === undefined ? {} : { 'Content-Type': 'application/json' },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
    await drop();
  };
  return { pool, request, close };
}

module.exports = { startApp };
