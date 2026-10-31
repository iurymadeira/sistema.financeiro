const { Pool } = require('pg');
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

const pool = new Pool({ ...config(), max: 10 });

module.exports = pool;
module.exports.config = config;
