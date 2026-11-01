const express = require('express');
const { idValido } = require('../middlewares/idValido');
const { validar } = require('../middlewares/validar');
const { criarMovimentacao, alterarMovimentacao } = require('../schemas/movimentacoes');

function criarMovimentacoesRoutes(controller) {
  const router = express.Router();
  router.get('/', controller.listar);
  router.post('/', validar(criarMovimentacao), controller.criar);
  router.patch('/:id', idValido, validar(alterarMovimentacao), controller.alterar);
  router.delete('/:id', idValido, controller.remover);
  return router;
}

module.exports = { criarMovimentacoesRoutes };
