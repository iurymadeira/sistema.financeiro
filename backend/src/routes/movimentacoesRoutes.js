const express = require('express');
const { AppError } = require('../errors');
const { validar } = require('../middlewares/validar');
const { criarMovimentacao, alterarMovimentacao } = require('../schemas/movimentacoes');

// O id da URL vira número no Postgres: algo que não seja dígitos (ou grande demais) nunca existe -> 404.
function idValido(req, res, next) {
  if (!/^\d{1,18}$/.test(req.params.id)) return next(new AppError(404, 'not_found', 'Movimentação não encontrada.'));
  next();
}

function criarMovimentacoesRoutes(controller) {
  const router = express.Router();
  router.get('/', controller.listar);
  router.post('/', validar(criarMovimentacao), controller.criar);
  router.patch('/:id', idValido, validar(alterarMovimentacao), controller.alterar);
  router.delete('/:id', idValido, controller.remover);
  return router;
}

module.exports = { criarMovimentacoesRoutes };
