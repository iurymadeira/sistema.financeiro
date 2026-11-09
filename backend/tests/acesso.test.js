const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { MAX_ERROS, JANELA_MS } = require('../src/middlewares/acesso');

// Estes testes NÃO usam banco: a portaria e o /health precisam funcionar antes dele.
// Se alguma rota tocasse o pool, este objeto estourava o teste.
const poolProibido = { query: () => { throw new Error('não deveria tocar no banco'); } };

async function subir(options = {}) {
  const server = createApp({ pool: poolProibido, ...options }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const req = async (path, { method = 'GET', headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  };
  return { req, close: () => new Promise((r) => server.close(r)) };
}

test('/health responde sem senha e sem tocar no banco', async (t) => {
  const s = await subir({ accessPassword: 'segredo' });
  t.after(s.close);
  const res = await s.req('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('sem senha enviada: 401 access_denied; com senha errada: 401; com a certa: 204', async (t) => {
  const s = await subir({ accessPassword: 'segredo' });
  t.after(s.close);
  const negado = await s.req('/access');
  assert.equal(negado.status, 401);
  assert.equal(negado.body.error.code, 'access_denied');
  assert.equal((await s.req('/access', { headers: { 'X-Access-Key': 'errada' } })).status, 401);
  assert.equal((await s.req('/access', { headers: { 'X-Access-Key': 'segredo' } })).status, 204);
});

test('a portaria barra as rotas de dados antes de chegar ao banco', async (t) => {
  const s = await subir({ accessPassword: 'segredo' });
  t.after(s.close);
  const res = await s.req('/movements');
  assert.equal(res.status, 401); // se passasse, o pool proibido causaria 500
});

test('sem ACCESS_PASSWORD configurada (desenvolvimento) não há portaria', async (t) => {
  const s = await subir({});
  t.after(s.close);
  assert.equal((await s.req('/access')).status, 204);
});

test('preflight do navegador passa sem senha e autoriza o cabeçalho X-Access-Key', async (t) => {
  const s = await subir({ accessPassword: 'segredo', frontendOrigin: 'https://meu.vercel.app' });
  t.after(s.close);
  const res = await s.req('/movements', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://meu.vercel.app',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'x-access-key',
    },
  });
  assert.equal(res.status, 204);
  assert.match(res.headers.get('access-control-allow-headers'), /x-access-key/i);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://meu.vercel.app');
});

test('FRONTEND_ORIGIN aceita várias origens separadas por vírgula', async (t) => {
  const s = await subir({ frontendOrigin: 'https://a.app, https://b.app' });
  t.after(s.close);
  const ok = (origin) => s.req('/health', { headers: { Origin: origin } }).then((r) => r.headers.get('access-control-allow-origin'));
  assert.equal(await ok('https://a.app'), 'https://a.app');
  assert.equal(await ok('https://b.app'), 'https://b.app');
  assert.equal(await ok('https://c.app'), null);
});

test('não anuncia "Express" no cabeçalho', async (t) => {
  const s = await subir({});
  t.after(s.close);
  assert.equal((await s.req('/health')).headers.get('x-powered-by'), null);
});

test('muitas senhas erradas bloqueiam (429) e a janela libera depois; acertar nunca é bloqueado antes do limite', async (t) => {
  let agora = 1_000_000;
  const s = await subir({ accessPassword: 'segredo', agora: () => agora });
  t.after(s.close);
  const errada = { headers: { 'X-Access-Key': 'errada' } };
  for (let i = 0; i < MAX_ERROS; i++) assert.equal((await s.req('/access', errada)).status, 401);
  const bloqueado = await s.req('/access', errada);
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.body.error.code, 'too_many_attempts');
  assert.ok(Number(bloqueado.headers.get('retry-after')) > 0);
  // Bloqueado mesmo com a senha certa (senão o atacante continuaria tentando de graça)
  assert.equal((await s.req('/access', { headers: { 'X-Access-Key': 'segredo' } })).status, 429);
  agora += JANELA_MS + 1;
  assert.equal((await s.req('/access', { headers: { 'X-Access-Key': 'segredo' } })).status, 204);
});

test('acertos repetidos não contam como erro', async (t) => {
  const s = await subir({ accessPassword: 'segredo' });
  t.after(s.close);
  for (let i = 0; i < MAX_ERROS + 5; i++) {
    assert.equal((await s.req('/access', { headers: { 'X-Access-Key': 'segredo' } })).status, 204);
  }
});
