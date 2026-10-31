// Aplica as migrations (database/migrations/*.sql) em ordem, uma única vez cada.
//
// - A tabela `schema_migrations` registra quais já rodaram; assim um banco antigo e um novo chegam ao mesmo estado.
// - Cada migration roda numa transação (o Postgres desfaz mudanças de estrutura): falhou, volta tudo.
// - Um "advisory lock" impede duas instâncias de migrarem ao mesmo tempo.
// - Nunca edite uma migration que já foi aplicada em algum ambiente: crie uma nova.
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', '..', 'database', 'migrations');
const LOCK_ID = 727274; // número qualquer, o mesmo em todas as instâncias

async function migrate(pool, dir = DIR) {
  const client = await pool.connect();
  const applied = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      nome TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const done = new Set((await client.query('SELECT nome FROM schema_migrations')).rows.map((r) => r.nome));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      try {
        await client.query('BEGIN');
        await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        err.message = `Migration ${file} falhou: ${err.message}`;
        throw err;
      }
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

module.exports = { migrate };

// `npm run migrate`
if (require.main === module) {
  const pool = require('../config/database');
  migrate(pool)
    .then((applied) => console.log(applied.length ? `Aplicadas: ${applied.join(', ')}` : 'Banco já está atualizado.'))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
