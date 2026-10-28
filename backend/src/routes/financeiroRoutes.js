const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');
const transacaoController = require('../controllers/transacaoController');
const estadoAplicacaoController = require('../controllers/estadoAplicacaoController');

router.get('/state', estadoAplicacaoController.buscar);
router.put('/state', estadoAplicacaoController.salvar);

// --- Rotas de Projeção (existentes) ---
router.post('/calcular', financeiroController.calcularEProjetar);
router.get('/carregar', financeiroController.carregarConfiguracao);

// --- Rotas de Transações ---
router.post('/transacoes', transacaoController.criar);                            // Cadastrar nova movimentação
router.get('/transacoes/usuario/:usuarioId', transacaoController.listar);        // Listar por usuário
router.delete('/transacoes/:id/usuario/:usuarioId', transacaoController.deletar); // Deletar movimentação

// --- Rotas de Exceções de Recorrência ---
router.post('/excecoes', transacaoController.criarExcecao);                      // Registrar exceção numa parcela

module.exports = router;
