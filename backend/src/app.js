const express = require('express');
const cors = require('cors');

const { identificarUsuario } = require('./middlewares/identificarUsuario');
const { naoEncontrado, tratarErros } = require('./middlewares/erros');
const { criarCategoriasRepository } = require('./repositories/categoriasRepository');
const { criarCategoriasService } = require('./services/categoriasService');
const { criarCategoriasController } = require('./controllers/categoriasController');
const { criarCategoriasRoutes } = require('./routes/categoriasRoutes');
const { criarMovimentacoesRepository } = require('./repositories/movimentacoesRepository');
const { criarMovimentacoesService } = require('./services/movimentacoesService');
const { criarMovimentacoesController } = require('./controllers/movimentacoesController');
const { criarMovimentacoesRoutes } = require('./routes/movimentacoesRoutes');
const { criarExcecoesService } = require('./services/excecoesService');
const { criarExcecoesController } = require('./controllers/excecoesController');
const { criarExcecoesRoutes } = require('./routes/excecoesRoutes');
const { criarPerfilRepository } = require('./repositories/perfilRepository');
const { criarPerfilService } = require('./services/perfilService');
const { criarPerfilController } = require('./controllers/perfilController');
const { criarPerfilRoutes } = require('./routes/perfilRoutes');
const { exigirSenhaDeAcesso } = require('./middlewares/acesso');
const { criarRelogio } = require('./domain/relogio');
require('./config/tiposPg');

// A "fábrica" do app: recebe o banco de fora (pool). Assim os testes montam o app num banco isolado,
// e o server.js monta com o banco de verdade. Aqui é o único lugar que liga repository -> service -> controller.
function createApp({ pool, frontendOrigin, accessPassword, relogio = criarRelogio(), agora } = {}) {
  const app = express();
  app.disable('x-powered-by'); // não anunciar "Express" a quem escaneia a internet
  app.set('trust proxy', 1); // atrás do proxy da hospedagem, `req.ip` é o do visitante e não o do proxy

  // FRONTEND_ORIGIN aceita várias origens separadas por vírgula (ex.: o site da Vercel e o de preview).
  const origens = (frontendOrigin || 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: [...origens, 'http://127.0.0.1:3000'],
      credentials: true, // o front envia cookie de sessão (docs/api.md)
      allowedHeaders: ['Content-Type', 'X-Access-Key'],
    }),
  ); // o CORS vem ANTES da senha: o "preflight" do navegador não leva a senha e precisa passar

  // Sem banco e sem senha: serve ao ping que impede a hospedagem de dormir (docs/deploy.md)
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Portaria provisória (ADR 0026): antes do corpo (json) e do banco, para barrar robôs barato
  const portaria = exigirSenhaDeAcesso(accessPassword, { agora });
  app.use('/api', portaria);
  app.get('/api/access', (req, res) => res.status(204).end()); // o front testa a senha aqui

  app.use(express.json({ limit: '512kb' })); // o maior corpo legítimo é a foto do perfil (até 200 mil caracteres)

  // Rotas novas: cada recurso passa por "quem é o usuário?" (rota que não existe responde 404 sem tocar no banco)
  const api = express.Router();
  const quem = identificarUsuario(pool);

  const categorias = criarCategoriasController(criarCategoriasService(criarCategoriasRepository(pool)));
  const perfil = criarPerfilController(criarPerfilService(criarPerfilRepository(pool)));
  api.use('/me', quem, criarPerfilRoutes(perfil));
  api.use('/categories', quem, criarCategoriasRoutes(categorias));

  const movimentacoesRepo = criarMovimentacoesRepository(pool);
  const movimentacoes = criarMovimentacoesController(criarMovimentacoesService(movimentacoesRepo, relogio));
  const excecoes = criarExcecoesRoutes(criarExcecoesController(criarExcecoesService(movimentacoesRepo)));
  api.use('/exceptions', quem, excecoes.lista);
  api.use('/movements/:id/exceptions', quem, excecoes.porMovimentacao);
  api.use('/movements', quem, criarMovimentacoesRoutes(movimentacoes));

  app.use('/api', api);
  app.use(naoEncontrado);
  app.use(tratarErros);
  return app;
}

module.exports = { createApp };
