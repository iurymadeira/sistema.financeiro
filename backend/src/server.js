require('dotenv').config();

const pool = require('./config/database');
const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;
// Local: só a própria máquina (127.0.0.1). Hospedagem: precisa ouvir em 0.0.0.0 para receber visitas (HOST=0.0.0.0).
const HOST = process.env.HOST || '127.0.0.1';
const accessPassword = process.env.ACCESS_PASSWORD;

// Em produção, esquecer a senha deixaria a API aberta a todos: preferimos não subir ("falhar fechado").
if (process.env.NODE_ENV === 'production' && !accessPassword) {
  console.error('ACCESS_PASSWORD é obrigatória em produção. Defina a variável e tente de novo.');
  process.exit(1);
}

const app = createApp({ pool, frontendOrigin: process.env.FRONTEND_ORIGIN, accessPassword });

const servidor = app.listen(PORT, HOST, () => {
  console.log(`Servidor Backend rodando em http://${HOST}:${PORT}`);
});

// A hospedagem manda SIGTERM ao trocar de versão: terminamos as requisições em andamento e fechamos o banco.
process.on('SIGTERM', () => {
  servidor.close(() => pool.end().then(() => process.exit(0)));
});
