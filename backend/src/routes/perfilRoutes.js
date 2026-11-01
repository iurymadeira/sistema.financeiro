const express = require('express');
const { validar } = require('../middlewares/validar');
const { alterarPerfil } = require('../schemas/perfil');

function criarPerfilRoutes(controller) {
  const router = express.Router();
  router.get('/', controller.buscar);
  router.patch('/', validar(alterarPerfil), controller.atualizar);
  return router;
}

module.exports = { criarPerfilRoutes };
