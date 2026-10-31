const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');
const estadoAplicacaoController = require('../controllers/estadoAplicacaoController');

// PROVISÓRIO: o front ainda salva o estado inteiro aqui (some quando a API relacional entrar).
router.get('/state', estadoAplicacaoController.buscar);
router.put('/state', estadoAplicacaoController.salvar);

// Projeção sem investimento (rota antiga; precisa ser revista junto da API relacional).
router.post('/calcular', financeiroController.calcularEProjetar);
router.get('/carregar', financeiroController.carregarConfiguracao);

module.exports = router;
