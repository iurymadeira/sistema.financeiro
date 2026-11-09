const { Pool } = require('pg');
require('./tiposPg');
require('dotenv').config();

// Hospedagens costumam fornecer uma única DATABASE_URL; no desenvolvimento usamos as variáveis separadas.
function config() {
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL, ssl };
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
  };
}

// Limites pensados para banco que dorme (Neon): poucas conexões, e desiste de esperar em vez de travar.
const pool = new Pool({ ...config(), max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 15_000 });

// Sem isto, o banco derrubando uma conexão ociosa (acontece quando ele "dorme") encerraria o servidor inteiro.
pool.on('error', (err) => console.error('Conexão ociosa do banco caiu (o pool abre outra):', err.message));

module.exports = pool;
module.exports.config = config;
