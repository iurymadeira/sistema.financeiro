const db = require('../config/database');
const calculoService = require('../services/calculoService');

exports.calcularEProjetar = async (req, res) => {
  try {
    const { saldoInicial, gastosFixos, receitasFixas, anos, transacoesVariaveis } = req.body;

    // 1. Processa o cálculo e as métricas usando o serviço de backend
    const projecao = calculoService.calcularProjecao(
      parseFloat(saldoInicial) || 0,
      parseFloat(gastosFixos) || 0,
      parseFloat(receitasFixas) || 0,
      parseInt(anos) || 1,
      transacoesVariaveis || []
    );

    const metricas = calculoService.obterMetricasProjecao(projecao);

    // 2. Persiste as configurações no banco
    const sql = `
      INSERT INTO configuracao_financeira (id, saldo_inicial, gastos_fixos, receitas_fixas, anos_projecao)
      VALUES (1, $1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        saldo_inicial = EXCLUDED.saldo_inicial,
        gastos_fixos = EXCLUDED.gastos_fixos,
        receitas_fixas = EXCLUDED.receitas_fixas,
        anos_projecao = EXCLUDED.anos_projecao;
    `;

    await db.query(sql, [saldoInicial, gastosFixos, receitasFixas, anos]);

    // 3. Retorna a projeção e métricas calculadas para a tela
    res.json({
      sucesso: true,
      projecao,
      metricas
    });
  } catch (erro) {
    console.error('Erro ao calcular projeção no Backend:', erro);
    res.status(400).json({ sucesso: false, erro: erro.message });
  }
};

exports.carregarConfiguracao = async (req, res) => {
  try {
    const { rows: linhas } = await db.query('SELECT * FROM configuracao_financeira WHERE id = 1');

    if (linhas.length === 0) return res.json(null);

    const dado = linhas[0];
    res.json({
      saldoInicial: parseFloat(dado.saldo_inicial),
      gastosFixos: parseFloat(dado.gastos_fixos),
      receitasFixas: parseFloat(dado.receitas_fixas),
      anos: parseInt(dado.anos_projecao)
    });
  } catch (erro) {
    console.error('Erro ao carregar do banco:', erro);
    res.status(500).json({ sucesso: false, erro: 'Erro interno ao consultar o banco.' });
  }
};