const express = require('express');
const { idValido } = require('../middlewares/idValido');
const { validar } = require('../middlewares/validar');
const { salvarExcecao } = require('../schemas/excecoes');

// Dois endereços: a lista de todas as exceções do usuário, e as de UMA movimentação (um mês por vez).
function criarExcecoesRoutes(controller) {
  const lista = express.Router();
  lista.get('/', controller.listar);

  const porMovimentacao = express.Router({ mergeParams: true }); // enxerga o :id do endereço-pai
  porMovimentacao.put('/:originalDate', idValido, validar(salvarExcecao), controller.salvar);
  porMovimentacao.delete('/:originalDate', idValido, controller.remover);

  return { lista, porMovimentacao };
}

module.exports = { criarExcecoesRoutes };
