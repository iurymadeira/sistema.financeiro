const test = require('node:test');
const assert = require('node:assert/strict');
const { skip } = require('./helpers/db');
const { startApp } = require('./helpers/app');

const HOJE = '2026-10-22';
const relogio = { hoje: () => HOJE };
const subir = () => startApp({ relogio });
const base = (over = {}) => ({ categoryId: 'alimentacao', amount: 2550, date: '2026-10-05', method: 'PIX', ...over });
const erro = (res, status, code) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.error.code, code);
  assert.equal(typeof res.body.error.message, 'string');
};

test('POST /movements: pontual devolve 201 no formato do contrato (tipo vem da categoria)', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const res = await app.request('POST', '/movements', base({ description: ' Mercado ' }));
  assert.equal(res.status, 201);
  const { id, createdAt, ...resto } = res.body;
  assert.match(id, /^\d+$/);
  assert.equal(typeof createdAt, 'number');
  assert.deepEqual(resto, {
    type: 'despesa', categoryId: 'alimentacao', amount: 2550, date: '2026-10-05',
    description: 'Mercado', method: 'PIX', recurring: false, endDate: null,
  });
  const receita = await app.request('POST', '/movements', base({ categoryId: 'salario', amount: 500000 }));
  assert.equal(receita.body.type, 'receita');
  assert.equal((await app.request('GET', '/movements')).body.length, 2);
});

test('dinheiro: centavos entram e saem exatos, e o banco guarda NUMERIC (sem float)', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  for (const amount of [1, 10, 29, 99999999999]) {
    const { body } = await app.request('POST', '/movements', base({ amount }));
    assert.equal(body.amount, amount);
  }
  const { rows } = await app.pool.query('SELECT valor::text AS v FROM transacoes ORDER BY id');
  assert.deepEqual(rows.map((r) => r.v), ['0.01', '0.10', '0.29', '999999999.99']);
});

test('datas nunca mudam de dia (independe do fuso do servidor)', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const { body } = await app.request('POST', '/movements', base({ date: '2026-03-01', recurring: true, endDate: '2026-12-31' }));
  assert.equal(body.date, '2026-03-01');
  assert.equal(body.endDate, '2026-12-31');
  assert.equal((await app.request('GET', '/movements')).body[0].date, '2026-03-01');
});

test('recorrente: com fim e indeterminada; pontual ignora endDate (fica null)', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const a = await app.request('POST', '/movements', base({ recurring: true, endDate: '2027-09-05' }));
  assert.equal(a.body.endDate, '2027-09-05');
  const b = await app.request('POST', '/movements', base({ recurring: true }));
  assert.equal(b.body.endDate, null);
  const c = await app.request('POST', '/movements', base({ recurring: false, endDate: '2027-09-05' }));
  assert.equal(c.body.endDate, null);
});

test('POST: validação devolve 400/422 com código do campo', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const post = (over) => app.request('POST', '/movements', base(over));
  for (const amount of [0, -5, 1.5, '25', null, 100000000000]) erro(await post({ amount }), 400, 'invalid_amount');
  for (const date of ['2026-02-30', '26-10-05', '', 20261005]) erro(await post({ date }), 400, 'invalid_date');
  erro(await post({ method: 'Cheque' }), 400, 'invalid_method');
  erro(await post({ recurring: 'sim' }), 400, 'invalid_recurring');
  erro(await post({ description: 'x'.repeat(251) }), 400, 'invalid_description');
  erro(await post({ endDate: '2026-13-01', recurring: true }), 400, 'invalid_endDate');
  erro(await post({ categoryId: '' }), 400, 'invalid_categoryId');
  erro(await post({ usuarioId: 7 }), 400, 'invalid_request');
  erro(await post({ type: 'receita' }), 400, 'invalid_request'); // o tipo vem da categoria, nunca do cliente
  erro(await app.request('POST', '/movements', {}), 400, 'invalid_categoryId');
});

test('POST: regras (422) — categoria inexistente, do sistema, arquivada, fim antes do início', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const post = (over) => app.request('POST', '/movements', base(over));
  erro(await post({ categoryId: 'nao-existe' }), 422, 'invalid_categoryId');
  erro(await post({ categoryId: '99999' }), 422, 'invalid_categoryId');
  erro(await post({ categoryId: 'ajuste-financeiro' }), 422, 'invalid_categoryId');
  erro(await post({ recurring: true, endDate: '2026-10-04' }), 422, 'invalid_endDate');
  const { body: cat } = await app.request('POST', '/categories', { name: 'Velha', type: 'despesa', icon: 'Gift' });
  assert.equal((await post({ categoryId: cat.id })).status, 201); // categoria criada pelo usuário funciona
  await app.pool.query('UPDATE categorias SET arquivada = TRUE WHERE id = $1', [cat.id]);
  erro(await post({ categoryId: cat.id }), 422, 'invalid_categoryId');
});

test('PATCH: altera campos, vira pontual (endDate some) e recusa o que não pode', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const { body: m } = await app.request('POST', '/movements', base({ recurring: true, endDate: '2027-01-05' }));
  const ok = await app.request('PATCH', `/movements/${m.id}`, { amount: 9000, description: 'Aluguel', method: 'Boleto' });
  assert.equal(ok.status, 200);
  assert.deepEqual([ok.body.amount, ok.body.description, ok.body.method, ok.body.endDate], [9000, 'Aluguel', 'Boleto', '2027-01-05']);
  const pontual = await app.request('PATCH', `/movements/${m.id}`, { recurring: false });
  assert.deepEqual([pontual.body.recurring, pontual.body.endDate], [false, null]);
  erro(await app.request('PATCH', `/movements/${m.id}`, {}), 400, 'invalid_request');
  erro(await app.request('PATCH', `/movements/${m.id}`, { categoryId: 'salario' }), 400, 'invalid_request');
  erro(await app.request('PATCH', `/movements/${m.id}`, { amount: 0 }), 400, 'invalid_amount');
  erro(await app.request('PATCH', `/movements/${m.id}`, { recurring: true, endDate: '2026-01-01' }), 422, 'invalid_endDate');
  // mover a data para depois do fim existente também é recusado, e nada muda
  await app.request('PATCH', `/movements/${m.id}`, { recurring: true, endDate: '2027-01-05' });
  erro(await app.request('PATCH', `/movements/${m.id}`, { date: '2027-06-01' }), 422, 'invalid_endDate');
  assert.equal((await app.request('GET', '/movements')).body[0].date, '2026-10-05');
});

test('DELETE: pontual remove; recorrência antiga encerra no mês anterior; criada neste mês remove', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const pontual = (await app.request('POST', '/movements', base())).body;
  assert.deepEqual((await app.request('DELETE', `/movements/${pontual.id}`)).body, { removed: true });

  const antiga = (await app.request('POST', '/movements', base({ date: '2026-01-05', recurring: true }))).body;
  assert.deepEqual((await app.request('DELETE', `/movements/${antiga.id}`)).body, { ended: true, endDate: '2026-09-30' });
  const depois = (await app.request('GET', '/movements')).body.find((x) => x.id === antiga.id);
  assert.equal(depois.endDate, '2026-09-30'); // continua existindo, só encerrada

  const nova = (await app.request('POST', '/movements', base({ date: '2026-10-05', recurring: true }))).body;
  assert.deepEqual((await app.request('DELETE', `/movements/${nova.id}`)).body, { removed: true });
  assert.ok(!(await app.request('GET', '/movements')).body.some((x) => x.id === nova.id));
});

test('exceções acompanham a regra: encerrar e alterar descartam as que ficaram soltas', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const { body: m } = await app.request('POST', '/movements', base({ date: '2026-01-05', recurring: true }));
  const addEx = (data, valor) => app.pool.query(
    'INSERT INTO transacao_excecoes (transacao_pai_id, data_original, novo_valor) VALUES ($1, $2, $3)', [m.id, data, valor]);
  await addEx('2026-03-05', 10); await addEx('2026-11-05', 20);
  const contar = async () => (await app.pool.query('SELECT count(*)::int n FROM transacao_excecoes')).rows[0].n;

  // mudar o dia da regra invalida TODAS as exceções (a data original deixa de existir)
  await app.request('PATCH', `/movements/${m.id}`, { date: '2026-01-06' });
  assert.equal(await contar(), 0);

  await app.request('PATCH', `/movements/${m.id}`, { date: '2026-01-05' });
  await addEx('2026-03-05', 10); await addEx('2026-11-05', 20);
  // encerrar em 30/09 mantém março e descarta novembro
  await app.request('DELETE', `/movements/${m.id}`);
  assert.equal(await contar(), 1);
  assert.equal((await app.pool.query('SELECT data_original FROM transacao_excecoes')).rows[0].data_original, '2026-03-05');
});

test('isolamento (IDOR): movimentação de outro usuário é invisível e intocável (404)', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  const { rows: [outro] } = await app.pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Outro', 'outro@exemplo.com', 'x') RETURNING id`);
  const { rows: [alheia] } = await app.pool.query(
    `INSERT INTO transacoes (usuario_id, categoria_id, forma_pagamento, valor, tipo, data_transacao)
     SELECT $1, id, 'PIX', 10, 'DESPESA', '2026-10-01' FROM categorias WHERE codigo = 'alimentacao' RETURNING id`, [outro.id]);
  assert.equal((await app.request('GET', '/movements')).body.length, 0);
  erro(await app.request('PATCH', `/movements/${alheia.id}`, { amount: 1 }), 404, 'not_found');
  erro(await app.request('DELETE', `/movements/${alheia.id}`), 404, 'not_found');
  assert.equal((await app.pool.query('SELECT valor::text v FROM transacoes WHERE id = $1', [alheia.id])).rows[0].v, '10.00');
});

test('id inválido ou inexistente: 404, nunca 500', { skip }, async (t) => {
  const app = await subir();
  t.after(app.close);
  for (const id of ['abc', '0', '999999', '99999999999999999999', '1;drop']) {
    erro(await app.request('DELETE', `/movements/${id}`), 404, 'not_found');
    erro(await app.request('PATCH', `/movements/${id}`, { amount: 5 }), 404, 'not_found');
  }
});
