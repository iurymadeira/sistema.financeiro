const express = require('express');
const cors = require('cors');
require('dotenv').config();

const financeiroRoutes = require('./routes/financeiroRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '5mb' }));

// Rotas da API
app.use('/api', financeiroRoutes);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor Backend rodando em http://localhost:${PORT}`);
});
