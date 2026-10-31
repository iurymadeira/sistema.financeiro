const express = require('express');
const cors = require('cors');

const { identificarUsuario } = require('./middlewares/identificarUsuario');
const { naoEncontrado, tratarErros } = require('./middlewares/erros');
const { criarCategoriasRepository } = require('./repositories/categoriasRepository');
const { criarCategoriasService } = require('./services/categoriasService');
const { criarCategoriasController } = require('./controllers/categoriasController');
const { criarCategoriasRoutes } = require('./routes/categoriasRoutes');
const financeiroRoutes = require('./routes/financeiroRoutes'); // PROVISÓRIO (/state, /calcular)

// A "fábrica" do app: recebe o banco de fora (pool). Assim os testes montam o app num banco isolado,
// e o server.js monta com o banco de verdade. Aqui é o único lugar que liga repository -> service -> controller.
function createApp({ pool, frontendOrigin, usuarioEmail } = {}) {
  const app = express();

  app.use(
    cors({
      origin: [frontendOrigin || 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true, // o front envia cookie de sessão (docs/api.md)
    }),
  );
  app.use(express.json({ limit: '5mb' })); // 5 MB só por causa do /state provisório; cai para o padrão quando ele sair

  // Rotas antigas, sem usuário (saem no PR 3)
  app.use('/api', financeiroRoutes);

  // Rotas novas: todas passam por "quem é o usuário?"
  const api = express.Router();
  api.use(identificarUsuario(pool, usuarioEmail));

  const categorias = criarCategoriasController(criarCategoriasService(criarCategoriasRepository(pool)));
  api.use('/categories', criarCategoriasRoutes(categorias));

  app.use('/api', api);
  app.use(naoEncontrado);
  app.use(tratarErros);
  return app;
}

module.exports = { createApp };
