const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularProjecao, obterMetricasProjecao } = require('../src/services/calculoService');

const dataHoje = new Date();
const anoAtual = dataHoje.getFullYear();

// Mock de transações
const transacoesMock = [
  {
    id: 1,
    descricao: 'Salário',
    valor: '5000.00',
    tipo: 'RECEITA',
    recorrente: true,
    intervalo: 1,
    data_transacao: '2026-01-01'
  },
  {
    id: 2,
    descricao: 'Aluguel',
    valor: '1500.00',
    tipo: 'DESPESA',
    recorrente: true,
    intervalo: 1,
    data_transacao: '2026-01-01'
  },
  {
    id: 3,
    descricao: 'Bônus Pontual',
    valor: '1000.00',
    tipo: 'RECEITA',
    recorrente: false,
    data_transacao: `${anoAtual}-01-15`
  }
];

// Mock de exceções
const excecoesMock = [
  {
    transacao_pai_id: 2, // Aluguel
    data_original: `${anoAtual}-02-01`,
    novo_valor: '2000.00', // Aluguel subiu para 2000 no 2º mês
    cancelado: false
  }
];

// Projeção de 1 ano com saldo inicial de R$ 1000
const resultado = calcularProjecao(1000, transacoesMock, excecoesMock, 1, new Date(anoAtual, 0, 1));
const mesesAno = resultado[anoAtual];

test('a projeção de 1 ano gera 12 meses', () => {
  assert.equal(mesesAno.length, 12);
});

test('a exceção de valor vale só no mês dela (aluguel de R$ 2000 em fevereiro)', () => {
  assert.equal(mesesAno[0].gastosDoMes, 1500); // janeiro: valor normal da regra
  assert.equal(mesesAno[1].gastosDoMes, 2000); // fevereiro: exceção
  assert.equal(mesesAno[2].gastosDoMes, 1500); // março volta ao normal
});

test('as métricas da projeção são calculadas', () => {
  const metricas = obterMetricasProjecao(resultado);
  assert.ok(metricas);
});
