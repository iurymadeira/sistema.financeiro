const express = require('express');
const { validar } = require('../middlewares/validar');
const { criarCategoria } = require('../schemas/categorias');

// Rotas: só ligam endereço -> validação -> controller.
function criarCategoriasRoutes(controller) {
  const router = express.Router();
  router.get('/', controller.listar);
  router.post('/', validar(criarCategoria), controller.criar);
  return router;
}

module.exports = { criarCategoriasRoutes };
