const test = require('node:test');
const assert = require('node:assert/strict');
const { migrate } = require('../src/db/migrate');
const { skip, freshPool } = require('./helpers/db');

let ctx;
const rejects = (promise, code) =>
  assert.rejects(promise, (e) => {
    assert.equal(e.code, code, `esperava o código ${code}, veio ${e.code}: ${e.message}`);
    return true;
  });
const CHECK = '23514'; // violação de CHECK
const UNIQUE = '23505';
const FK = '23503';

test.before(async () => {
  if (skip) return;
  ctx = await freshPool();
});
test.after(async () => ctx && (await ctx.drop()));

test('aplica todas as migrations num banco vazio e registra cada uma', { skip }, async () => {
  const applied = await migrate(ctx.pool);
  assert.deepEqual(applied, ['001_esquema_inicial.sql', '002_categorias_padrao.sql', '003_tabelas_provisorias.sql', '004_usuario_provisorio.sql', '005_remove_configuracao_financeira.sql']);
  const { rows } = await ctx.pool.query('SELECT count(*)::int AS n FROM schema_migrations');
  assert.equal(rows[0].n, 5);
});

test('rodar de novo não faz nada (idempotente)', { skip }, async () => {
  assert.deepEqual(await migrate(ctx.pool), []);
});

test('as 9 categorias padrão existem, com os códigos que o front usa', { skip }, async () => {
  const { rows } = await ctx.pool.query('SELECT codigo, tipo, sistema FROM categorias ORDER BY id');
  assert.equal(rows.length, 9);
  assert.deepEqual(rows.find((r) => r.codigo === 'salario'), { codigo: 'salario', tipo: 'RECEITA', sistema: false });
  assert.equal(rows.find((r) => r.codigo === 'ajuste-financeiro').sistema, true);
});

async function umUsuario(email = 'a@b.co') {
  const { rows } = await ctx.pool.query(
    "INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Ana', $1, 'hash') RETURNING id", [email]);
  return rows[0].id;
}
const catId = async (codigo) =>
  (await ctx.pool.query('SELECT id FROM categorias WHERE codigo = $1', [codigo])).rows[0].id;
const insertTx = (over = {}) => {
  const t = { usuario: 1, categoria: 1, forma: 'PIX', valor: '10.00', tipo: 'DESPESA', data: '2026-01-05', rec: false, fim: null, ...over };
  return ctx.pool.query(
    `INSERT INTO transacoes (usuario_id, categoria_id, forma_pagamento, valor, tipo, data_transacao, recorrente, data_fim)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [t.usuario, t.categoria, t.forma, t.valor, t.tipo, t.data, t.rec, t.fim]);
};

test('o banco recusa dados inválidos mesmo que a API erre (defesa em profundidade)', { skip }, async () => {
  const usuario = await umUsuario();
  const categoria = await catId('alimentacao');
  const base = { usuario, categoria };

  await insertTx(base) // controle: o válido entra
  await rejects(insertTx({ ...base, forma: 'Cheque' }), CHECK)                        // forma de pagamento fora da lista
  await rejects(insertTx({ ...base, forma: 'pix' }), CHECK)                           // maiúsculas importam
  await rejects(insertTx({ ...base, valor: '0' }), CHECK)                             // valor precisa ser > 0
  await rejects(insertTx({ ...base, valor: '-5.00' }), CHECK)
  await rejects(insertTx({ ...base, tipo: 'NEUTRO' }), CHECK)
  await rejects(insertTx({ ...base, rec: true, fim: '2025-12-01' }), CHECK)           // fim antes do início
  await rejects(insertTx({ ...base, rec: false, fim: '2026-12-01' }), CHECK)          // pontual não tem fim
  await insertTx({ ...base, rec: true, fim: '2026-12-05' })                           // recorrente com fim válido
  await rejects(insertTx({ ...base, usuario: 999999 }), FK)                           // usuário inexistente
});

test('categoria: nome repetido (sem ligar para maiúsculas) é recusado, e padrão exige código', { skip }, async () => {
  const usuario = await umUsuario('c@d.co');
  const ins = (nome, tipo = 'DESPESA') =>
    ctx.pool.query("INSERT INTO categorias (usuario_id, nome, icone, tipo) VALUES ($1,$2,'Gift',$3)", [usuario, nome, tipo]);
  await ins('Pets');
  await rejects(ins('PETS'), UNIQUE);
  await ins('Pets', 'RECEITA'); // outro tipo pode ter o mesmo nome
  await rejects(ctx.pool.query("INSERT INTO categorias (usuario_id, nome, icone, tipo) VALUES (NULL,'X','Gift','DESPESA')"), CHECK);
});

test('exceções: um mês, uma exceção; nova data no mesmo mês; apagar a recorrência apaga as exceções', { skip }, async () => {
  const usuario = await umUsuario('e@f.co');
  const { rows } = await insertTx({ usuario, categoria: await catId('moradia'), rec: true });
  const pai = rows[0].id;
  const ins = (original, nova, valor = null, cancelado = false) =>
    ctx.pool.query(
      'INSERT INTO transacao_excecoes (transacao_pai_id, data_original, nova_data, novo_valor, cancelado) VALUES ($1,$2,$3,$4,$5)',
      [pai, original, nova, valor, cancelado]);
  await ins('2026-03-05', '2026-03-09', '9000.00');
  await rejects(ins('2026-03-05', null, null, true), UNIQUE);          // o mês já tem exceção
  await rejects(ins('2026-04-05', '2026-05-01'), CHECK);               // nova data fora do mês
  await rejects(ins('2026-06-05', null, '0'), CHECK);                  // valor novo > 0
  await ctx.pool.query('DELETE FROM transacoes WHERE id = $1', [pai]);
  const { rows: left } = await ctx.pool.query('SELECT count(*)::int AS n FROM transacao_excecoes');
  assert.equal(left[0].n, 0);
});

test('migration que falha desfaz tudo (transação) e não é registrada', { skip }, async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-'));
  fs.writeFileSync(path.join(dir, '001_ok.sql'), 'CREATE TABLE teste_a (id int);');
  fs.writeFileSync(path.join(dir, '002_quebra.sql'), 'CREATE TABLE teste_b (id int); SELECT coluna_que_nao_existe FROM teste_a;');
  await assert.rejects(migrate(ctx.pool, dir), /002_quebra\.sql falhou/);
  const { rows } = await ctx.pool.query("SELECT to_regclass('teste_a') AS a, to_regclass('teste_b') AS b");
  assert.ok(rows[0].a, 'a 001 (que passou) permanece');
  assert.equal(rows[0].b, null, 'a 002 foi desfeita por inteiro, inclusive o CREATE TABLE que vinha antes do erro');
  const { rows: reg } = await ctx.pool.query("SELECT nome FROM schema_migrations WHERE nome LIKE '00_\\_%'  ORDER BY nome");
  assert.ok(!reg.some((r) => r.nome === '002_quebra.sql'));
});

test('a tabela da rota /calcular foi removida (ADR 0023); a do /state provisório continua', { skip }, async () => {
  const { rows } = await ctx.pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('configuracao_financeira', 'estado_aplicacao')`);
  assert.deepEqual(rows.map((r) => r.table_name), ['estado_aplicacao']);
});
