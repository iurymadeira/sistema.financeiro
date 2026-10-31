require('dotenv').config();

const pool = require('./config/database');
const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;
const app = createApp({ pool, frontendOrigin: process.env.FRONTEND_ORIGIN });

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor Backend rodando em http://localhost:${PORT}`);
});
