const test = require('node:test');
const assert = require('node:assert/strict');
const { skip } = require('./helpers/db');
const { startApp } = require('./helpers/app');

const relogio = { hoje: () => '2026-10-22' };
const erro = (res, status, code) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.error.code, code);
};
const URL = (id, data) => `/movements/${id}/exceptions/${data}`;

// Aluguel de R$ 2.000,00 todo dia 05, de janeiro a junho de 2026
async function comAluguel(t) {
  const app = await startApp({ relogio });
  t.after(app.close);
  const { body: m } = await app.request('POST', '/movements', {
    categoryId: 'moradia', amount: 200000, date: '2026-01-05', method: 'Boleto', recurring: true, endDate: '2026-06-05',
  });
  return { app, m };
}
const contar = async (app) => (await app.pool.query('SELECT count(*)::int n FROM transacao_excecoes')).rows[0].n;

test('PUT cria a exceção de valor e GET /exceptions a lista (formato do contrato)', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  assert.deepEqual((await app.request('GET', '/exceptions')).body, []);
  const res = await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 210000, date: null, cancelled: false });
  assert.equal(res.status, 200);
  const { id, ...resto } = res.body;
  assert.match(id, /^\d+$/);
  assert.deepEqual(resto, { movementId: m.id, originalDate: '2026-03-05', newAmount: 210000, newDate: null, cancelled: false });
  const lista = (await app.request('GET', '/exceptions')).body;
  assert.equal(lista.length, 1);
  assert.equal(lista[0].newAmount, 210000);
});

test('PUT com nova data (mesmo mês) e com valor+data juntos', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  const a = await app.request('PUT', URL(m.id, '2026-02-05'), { amount: null, date: '2026-02-10', cancelled: false });
  assert.deepEqual([a.body.newAmount, a.body.newDate], [null, '2026-02-10']);
  const b = await app.request('PUT', URL(m.id, '2026-04-05'), { amount: 1, date: '2026-04-30', cancelled: false });
  assert.deepEqual([b.body.newAmount, b.body.newDate], [1, '2026-04-30']);
});

test('cancelar um mês: valor e data enviados junto são ignorados', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  const res = await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 5, date: '2026-03-09', cancelled: true });
  assert.deepEqual([res.body.cancelled, res.body.newAmount, res.body.newDate], [true, null, null]);
});

test('gravar de novo substitui (um mês, uma exceção) e vale para meses passados', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 1000, date: null, cancelled: false });
  await app.request('PUT', URL(m.id, '2026-03-05'), { amount: null, date: null, cancelled: true });
  assert.equal(await contar(app), 1);
  const [e] = (await app.request('GET', '/exceptions')).body;
  assert.deepEqual([e.cancelled, e.newAmount], [true, null]);
});

test('ficou igual à regra: 204 e a exceção que existia é apagada', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 1000, date: null, cancelled: false });
  assert.equal(await contar(app), 1);
  const igual = await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 200000, date: '2026-03-05', cancelled: false });
  assert.equal(igual.status, 204);
  assert.equal(await contar(app), 0);
  assert.equal((await app.request('PUT', URL(m.id, '2026-03-05'), { amount: null, date: null, cancelled: false })).status, 204);
});

test('422: mês que a regra não gera, ou data fora do mês', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  const corpo = { amount: 1000, date: null, cancelled: false };
  erro(await app.request('PUT', URL(m.id, '2025-12-05'), corpo), 422, 'invalid_originalDate'); // antes do início
  erro(await app.request('PUT', URL(m.id, '2026-07-05'), corpo), 422, 'invalid_originalDate'); // depois do fim
  erro(await app.request('PUT', URL(m.id, '2026-03-06'), corpo), 422, 'invalid_originalDate'); // dia que a regra não gera
  erro(await app.request('PUT', URL(m.id, '2026-03-05'), { ...corpo, date: '2026-04-01' }), 422, 'invalid_date');
  const { body: pontual } = await app.request('POST', '/movements', { categoryId: 'alimentacao', amount: 100, date: '2026-03-05', method: 'PIX' });
  erro(await app.request('PUT', URL(pontual.id, '2026-03-05'), corpo), 422, 'invalid_originalDate'); // pontual não tem meses
  assert.equal(await contar(app), 0);
});

test('400: corpo inválido e data do mês malformada', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  const ok = { amount: 1000, date: null, cancelled: false };
  erro(await app.request('PUT', URL(m.id, '2026-03-05'), { ...ok, amount: 0 }), 400, 'invalid_amount');
  erro(await app.request('PUT', URL(m.id, '2026-03-05'), { ...ok, amount: 1.5 }), 400, 'invalid_amount');
  erro(await app.request('PUT', URL(m.id, '2026-03-05'), { ...ok, date: '2026-02-30' }), 400, 'invalid_date');
  erro(await app.request('PUT', URL(m.id, '2026-03-05'), { ...ok, cancelled: 'sim' }), 400, 'invalid_cancelled');
  erro(await app.request('PUT', URL(m.id, '2026-03-05'), { ...ok, movementId: '1' }), 400, 'invalid_request');
  erro(await app.request('PUT', URL(m.id, 'marco'), ok), 400, 'invalid_originalDate');
  erro(await app.request('DELETE', URL(m.id, '2026-02-30')), 400, 'invalid_originalDate');
});

test('DELETE volta o mês ao que a regra manda (204) e é idempotente', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 1000, date: null, cancelled: false });
  assert.equal((await app.request('DELETE', URL(m.id, '2026-03-05'))).status, 204);
  assert.equal(await contar(app), 0);
  assert.equal((await app.request('DELETE', URL(m.id, '2026-03-05'))).status, 204);
});

test('isolamento (IDOR): não lê, grava nem apaga exceção de movimentação alheia', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  const { rows: [outro] } = await app.pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Outro', 'outro@exemplo.com', 'x') RETURNING id`);
  const { rows: [alheia] } = await app.pool.query(
    `INSERT INTO transacoes (usuario_id, categoria_id, forma_pagamento, valor, tipo, data_transacao, recorrente)
     SELECT $1, id, 'PIX', 10, 'DESPESA', '2026-01-05', TRUE FROM categorias WHERE codigo = 'moradia' RETURNING id`, [outro.id]);
  await app.pool.query(`INSERT INTO transacao_excecoes (transacao_pai_id, data_original, cancelado) VALUES ($1, '2026-03-05', TRUE)`, [alheia.id]);

  assert.deepEqual((await app.request('GET', '/exceptions')).body, []); // a do outro não aparece
  const corpo = { amount: 1000, date: null, cancelled: false };
  erro(await app.request('PUT', URL(alheia.id, '2026-03-05'), corpo), 404, 'not_found');
  erro(await app.request('DELETE', URL(alheia.id, '2026-03-05')), 404, 'not_found');
  assert.equal(await contar(app), 1); // a do outro continua lá
  erro(await app.request('PUT', URL('999999', '2026-03-05'), corpo), 404, 'not_found');
  erro(await app.request('PUT', URL('abc', '2026-03-05'), corpo), 404, 'not_found');
  assert.ok(m.id);
});

test('dinheiro da exceção: centavos exatos no banco e na resposta', { skip }, async (t) => {
  const { app, m } = await comAluguel(t);
  const res = await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 29, date: null, cancelled: false });
  assert.equal(res.body.newAmount, 29);
  assert.equal((await app.pool.query('SELECT novo_valor::text v FROM transacao_excecoes')).rows[0].v, '0.29');
});

test('apagar a recorrência apaga as exceções (e encerrar mantém só as dos meses que ficam)', { skip }, async (t) => {
  const app = await startApp({ relogio });
  t.after(app.close);
  const { body: m } = await app.request('POST', '/movements', { categoryId: 'moradia', amount: 200000, date: '2026-01-05', method: 'Boleto', recurring: true });
  await app.request('PUT', URL(m.id, '2026-03-05'), { amount: 1000, date: null, cancelled: false });
  await app.request('PUT', URL(m.id, '2026-11-05'), { amount: 1000, date: null, cancelled: false });
  await app.request('DELETE', `/movements/${m.id}`); // hoje = 22/10: encerra em 30/09
  assert.deepEqual((await app.request('GET', '/exceptions')).body.map((e) => e.originalDate), ['2026-03-05']);
});
