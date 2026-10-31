const test = require('node:test');
const assert = require('node:assert/strict');
const { skip } = require('./helpers/db');
const { startApp } = require('./helpers/app');

const erro = (res, status, code) => {
  assert.equal(res.status, status);
  assert.equal(res.body.error.code, code);
  assert.equal(typeof res.body.error.message, 'string');
};

test('GET /categories devolve as 9 padrão no formato do contrato', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const res = await app.request('GET', '/categories');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 9);
  assert.deepEqual(res.body.find((c) => c.id === 'salario'), { id: 'salario', name: 'Salário', type: 'receita', icon: 'Banknote' });
  assert.deepEqual(res.body.find((c) => c.id === 'ajuste-financeiro'), {
    id: 'ajuste-financeiro', name: 'Ajuste Financeiro', type: 'despesa', icon: 'Scale', system: true,
  });
});

test('POST /categories cria, devolve 201 e passa a aparecer na lista', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const res = await app.request('POST', '/categories', { name: '  Academia ', type: 'despesa', icon: 'Dumbbell' });
  assert.equal(res.status, 201);
  assert.match(res.body.id, /^\d+$/); // id como texto
  const { id, ...resto } = res.body;
  assert.deepEqual(resto, { name: 'Academia', type: 'despesa', icon: 'Dumbbell', custom: true });
  const lista = await app.request('GET', '/categories');
  assert.equal(lista.body.length, 10);
  assert.ok(lista.body.some((c) => c.id === id));
});

test('nome repetido no mesmo tipo dá 409 (sem diferenciar maiúsculas, inclusive contra as padrão)', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  await app.request('POST', '/categories', { name: 'Academia', type: 'despesa', icon: 'Dumbbell' });
  erro(await app.request('POST', '/categories', { name: 'ACADEMIA', type: 'despesa', icon: 'Gift' }), 409, 'category_exists');
  erro(await app.request('POST', '/categories', { name: 'alimentação', type: 'despesa', icon: 'Gift' }), 409, 'category_exists');
  // O mesmo nome em outro tipo é permitido
  assert.equal((await app.request('POST', '/categories', { name: 'Academia', type: 'receita', icon: 'Dumbbell' })).status, 201);
});

test('duas criações simultâneas do mesmo nome: uma vence, a outra recebe 409 (nunca 500)', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const corpo = { name: 'Corrida', type: 'despesa', icon: 'Dumbbell' };
  const respostas = await Promise.all(Array.from({ length: 5 }, () => app.request('POST', '/categories', corpo)));
  assert.equal(respostas.filter((r) => r.status === 201).length, 1);
  assert.equal(respostas.filter((r) => r.status === 409).length, 4);
});

test('validação: devolve 400 com código do campo e mensagem em português', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const ok = { name: 'X', type: 'despesa', icon: 'Gift' };
  erro(await app.request('POST', '/categories', { ...ok, name: '   ' }), 400, 'invalid_name');
  erro(await app.request('POST', '/categories', { ...ok, name: 'a'.repeat(51) }), 400, 'invalid_name');
  erro(await app.request('POST', '/categories', { ...ok, name: 123 }), 400, 'invalid_name');
  erro(await app.request('POST', '/categories', { ...ok, type: 'neutro' }), 400, 'invalid_type');
  erro(await app.request('POST', '/categories', { ...ok, icon: 'gift; drop table' }), 400, 'invalid_icon');
  erro(await app.request('POST', '/categories', { name: 'X', type: 'despesa' }), 400, 'invalid_icon');
  erro(await app.request('POST', '/categories', { ...ok, usuarioId: 99 }), 400, 'invalid_request'); // campo desconhecido
  erro(await app.request('POST', '/categories', [1, 2]), 400, 'invalid_request');
  erro(await app.request('POST', '/categories'), 400, 'invalid_request'); // sem corpo
  const msg = (await app.request('POST', '/categories', { ...ok, type: 'x' })).body.error.message;
  assert.equal(msg, 'O tipo deve ser "receita" ou "despesa".');
});

test('JSON quebrado e rota inexistente usam o mesmo formato de erro', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  erro(await app.request('POST', '/categories', undefined, { raw: '{quebrado' }), 400, 'invalid_json');
  erro(await app.request('GET', '/nao-existe'), 404, 'not_found');
});

test('categoria arquivada só aparece se ainda houver lançamentos nela (ADR 0011)', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const { body: cat } = await app.request('POST', '/categories', { name: 'Antiga', type: 'despesa', icon: 'Gift' });
  await app.pool.query('UPDATE categorias SET arquivada = TRUE WHERE id = $1', [cat.id]);
  assert.ok(!(await app.request('GET', '/categories')).body.some((c) => c.id === cat.id));

  const { rows } = await app.pool.query('SELECT id FROM usuarios');
  await app.pool.query(
    `INSERT INTO transacoes (usuario_id, categoria_id, forma_pagamento, valor, tipo, data_transacao)
     VALUES ($1, $2, 'PIX', 10.00, 'DESPESA', '2026-01-10')`,
    [rows[0].id, cat.id],
  );
  assert.ok((await app.request('GET', '/categories')).body.some((c) => c.id === cat.id));
});

test('isolamento: categoria de outro usuário nunca aparece', { skip }, async (t) => {
  const app = await startApp();
  t.after(app.close);
  const { rows } = await app.pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Outro', 'outro@exemplo.com', 'x') RETURNING id`,
  );
  await app.pool.query(
    `INSERT INTO categorias (usuario_id, nome, icone, tipo) VALUES ($1, 'Segredo', 'Gift', 'DESPESA')`,
    [rows[0].id],
  );
  const lista = (await app.request('GET', '/categories')).body;
  assert.equal(lista.length, 9);
  assert.ok(!lista.some((c) => c.name === 'Segredo'));
  // ...e o nome dele não bloqueia o nosso usuário
  assert.equal((await app.request('POST', '/categories', { name: 'Segredo', type: 'despesa', icon: 'Gift' })).status, 201);
});

test('sem o usuário provisório (migration não rodou) a API avisa com clareza', { skip }, async (t) => {
  const app = await startApp({ usuarioEmail: 'nao-existe@exemplo.com' });
  t.after(app.close);
  const orig = console.error;
  const res = await app.request('GET', '/categories');
  console.error = orig;
  erro(res, 500, 'provisional_user_missing');
});
