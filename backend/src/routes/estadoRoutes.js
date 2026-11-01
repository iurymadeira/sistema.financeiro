const express = require('express');
const router = express.Router();
const estadoAplicacaoController = require('../controllers/estadoAplicacaoController');

// PROVISÓRIO: o front ainda salva o estado inteiro aqui. Sai no PR 3, quando o front passar a usar a API relacional.
router.get('/state', estadoAplicacaoController.buscar);
router.put('/state', estadoAplicacaoController.salvar);

module.exports = router;
