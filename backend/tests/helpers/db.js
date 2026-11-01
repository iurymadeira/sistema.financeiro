// Ajuda dos testes de integração: cria um schema novo e isolado por arquivo de teste.
// Precisam de um Postgres de teste: defina TEST_DATABASE_URL (o CI faz isso). Sem ela, são pulados.
const { Pool } = require('pg');
require('../../src/config/tiposPg');

const URL = process.env.TEST_DATABASE_URL;
const skip = URL ? false : 'defina TEST_DATABASE_URL para rodar os testes de banco';

async function freshPool() {
  const schema = `t_${process.pid}_${Date.now()}`;
  const admin = new Pool({ connectionString: URL, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();
  // search_path faz todas as tabelas serem criadas e lidas dentro do schema isolado
  const pool = new Pool({ connectionString: URL, max: 4, options: `-c search_path=${schema}` });
  const drop = async () => {
    await pool.end();
    const a = new Pool({ connectionString: URL, max: 1 });
    await a.query(`DROP SCHEMA ${schema} CASCADE`);
    await a.end();
  };
  return { pool, drop };
}

module.exports = { skip, freshPool };
