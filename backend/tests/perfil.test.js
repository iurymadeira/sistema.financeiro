const test = require('node:test');
const assert = require('node:assert/strict');
const { skip } = require('./helpers/db');
const { startApp } = require('./helpers/app');
const { createApp } = require('../src/app');

const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
const erro = (res, status, code) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.error.code, code);
  assert.equal(typeof res.body.error.message, 'string');
};

test('GET /me devolve o perfil de demonstração do usuário provisório', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const res = await app.request('GET', '/me');
  assert.equal(res.status, 200);
  const { id, ...resto } = res.body;
  assert.match(id, /^\d+$/);
  assert.deepEqual(resto, { name: 'Marina', email: 'marina@exemplo.com', photo: null });
});

test('PATCH /me altera só o que veio; e-mail é guardado em minúsculas; espaços das pontas saem', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const a = await app.request('PATCH', '/me', { name: '  Ana Souza ' });
  assert.deepEqual([a.body.name, a.body.email], ['Ana Souza', 'marina@exemplo.com']);
  const b = await app.request('PATCH', '/me', { email: ' ANA@Exemplo.COM ' });
  assert.deepEqual([b.body.name, b.body.email], ['Ana Souza', 'ana@exemplo.com']);
  assert.equal((await app.request('GET', '/me')).body.email, 'ana@exemplo.com');
});

test('foto: grava, troca e remove com null (sem mexer nos outros campos)', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  assert.equal((await app.request('PATCH', '/me', { photo: FOTO })).body.photo, FOTO);
  assert.equal((await app.request('PATCH', '/me', { name: 'Outra' })).body.photo, FOTO); // não some ao mudar o nome
  assert.equal((await app.request('PATCH', '/me', { photo: null })).body.photo, null);
});

test('validação: nome, e-mail, foto, campos desconhecidos e corpo vazio', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const patch = (corpo) => app.request('PATCH', '/me', corpo);
  erro(await patch({ name: '   ' }), 400, 'invalid_name');
  erro(await patch({ name: 'a'.repeat(101) }), 400, 'invalid_name');
  erro(await patch({ email: 'sem-arroba' }), 400, 'invalid_email');
  erro(await patch({ email: 'a@b' }), 400, 'invalid_email');
  erro(await patch({ photo: 'http://exemplo.com/foto.jpg' }), 400, 'invalid_photo');
  erro(await patch({ photo: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }), 400, 'invalid_photo'); // SVG pode carregar script
  erro(await patch({ photo: 'data:image/jpeg;base64,' + 'A'.repeat(200_000) }), 400, 'invalid_photo');
  erro(await patch({ password: 'x12345678' }), 400, 'invalid_request'); // senha não passa por aqui
  erro(await patch({ id: '99' }), 400, 'invalid_request');
  erro(await patch({}), 400, 'invalid_request');
  assert.equal((await app.request('GET', '/me')).body.name, 'Marina'); // nada mudou
});

test('e-mail já usado por outra conta dá 409', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  await app.pool.query(`INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Outro', 'outro@exemplo.com', 'x')`);
  erro(await app.request('PATCH', '/me', { email: 'Outro@Exemplo.com' }), 409, 'email_in_use');
  assert.equal((await app.request('GET', '/me')).body.email, 'marina@exemplo.com');
});

test('trocar o e-mail não faz o servidor "perder" o usuário (reinício incluso)', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  await app.request('PATCH', '/me', { email: 'novo@exemplo.com' });
  // um servidor NOVO (como após um reinício) precisa continuar achando o mesmo usuário
  const server = createApp({ pool: app.pool }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/me`);
  assert.equal((await res.json()).email, 'novo@exemplo.com');
});

test('isolamento: o PATCH nunca altera outro usuário', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const { rows: [outro] } = await app.pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Outro', 'outro@exemplo.com', 'x') RETURNING id`);
  await app.request('PATCH', '/me', { name: 'Marina Nova', photo: FOTO });
  const { rows: [depois] } = await app.pool.query('SELECT nome, foto FROM usuarios WHERE id = $1', [outro.id]);
  assert.deepEqual([depois.nome, depois.foto], ['Outro', null]);
});

test('o banco também recusa foto inválida (defesa em profundidade)', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  await assert.rejects(app.pool.query(`UPDATE usuarios SET foto = 'javascript:alert(1)'`), { code: '23514' });
});
