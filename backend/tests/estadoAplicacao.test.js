const test = require('node:test');
const assert = require('node:assert/strict');
const { migrate } = require('../src/db/migrate');
const { skip, freshPool } = require('./helpers/db');

test('estado_aplicacao: grava, relê e sobrescreve (provisório)', { skip }, async (t) => {
  const { pool, drop } = await freshPool();
  t.after(drop);
  await migrate(pool);
  // O repositório usa o pool padrão; aqui exercitamos o mesmo SQL no schema isolado.
  const up = (dados) =>
    pool.query(`INSERT INTO estado_aplicacao (id, dados) VALUES (1, $1)
                ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados`, [JSON.stringify(dados)]);
  await up({ movements: [1] });
  await up({ movements: [1, 2] });
  const { rows } = await pool.query('SELECT dados FROM estado_aplicacao WHERE id = 1');
  assert.deepEqual(rows[0].dados, { movements: [1, 2] });
  assert.equal((await pool.query('SELECT count(*)::int n FROM estado_aplicacao')).rows[0].n, 1);
});
