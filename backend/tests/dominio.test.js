// Regras puras do servidor. Espelham os testes do front (frontend/tests/recorrencia.test.mjs):
// as MESMAS entradas precisam dar as MESMAS respostas nos dois lados (ADR 0021).
const test = require('node:test');
const assert = require('node:assert/strict');
const { dataValida, somarMeses, mesesEntre, ultimoDiaDoMesAnterior } = require('../src/domain/datas');
const { encerramento, excecaoValida } = require('../src/domain/recorrencia');
const { criarRelogio } = require('../src/domain/relogio');

const rec = (over = {}) => ({ data: '2026-01-05', dataFim: null, ...over });

test('dataValida: confere o calendário de verdade', () => {
  for (const ok of ['2026-02-28', '2024-02-29', '2026-12-31']) assert.equal(dataValida(ok), true, ok);
  for (const ruim of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '26-1-1', '2026-1-01', '', null, 20260101, '2026-01-01T00:00']) {
    assert.equal(dataValida(ruim), false, String(ruim));
  }
});

test('somarMeses: mantém o dia ou usa o último dia do mês (igual ao front)', () => {
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(somarMeses('2026-01-05', 11), '2026-12-05');
  assert.equal(somarMeses('2026-11-15', 3), '2027-02-15');
  assert.equal(somarMeses('2026-03-31', -1), '2026-02-28');
});

test('mesesEntre e ultimoDiaDoMesAnterior', () => {
  assert.equal(mesesEntre('2026-01-05', '2026-03-04'), 1);
  assert.equal(mesesEntre('2026-01-05', '2026-03-05'), 2);
  assert.equal(ultimoDiaDoMesAnterior('2026-01-15'), '2025-12-31');
  assert.equal(ultimoDiaDoMesAnterior('2024-03-10'), '2024-02-29');
});

// Os cinco casos de "excluir recorrência" do front (ADR 0012)
test('encerramento: recorrência antiga encerra no último dia do mês anterior', () => {
  assert.deepEqual(encerramento(rec(), '2026-10-22'), { remover: false, dataFim: '2026-09-30' });
});
test('encerramento: começou no mês passado, mantém o mês passado', () => {
  assert.deepEqual(encerramento(rec({ data: '2026-09-05' }), '2026-10-22'), { remover: false, dataFim: '2026-09-30' });
});
test('encerramento: criada neste mês ou ainda não começou, remove por completo', () => {
  assert.deepEqual(encerramento(rec({ data: '2026-10-05' }), '2026-10-22'), { remover: true });
  assert.deepEqual(encerramento(rec({ data: '2026-12-05' }), '2026-10-22'), { remover: true });
});
test('encerramento: virada de ano e fim que já aconteceria antes não é "esticado"', () => {
  assert.deepEqual(encerramento(rec({ data: '2025-06-05' }), '2026-01-15'), { remover: false, dataFim: '2025-12-31' });
  assert.deepEqual(encerramento(rec({ dataFim: '2026-03-05' }), '2026-10-22'), { remover: false, dataFim: '2026-03-05' });
});

test('excecaoValida: só meses que a regra realmente gera', () => {
  const m = { recorrente: true, data: '2026-01-05', dataFim: '2026-06-05' };
  assert.equal(excecaoValida(m, '2026-03-05'), true);
  assert.equal(excecaoValida(m, '2025-12-05'), false); // antes do início
  assert.equal(excecaoValida(m, '2026-07-05'), false); // depois do fim
  assert.equal(excecaoValida(m, '2026-03-06'), false); // dia diferente do da regra
  assert.equal(excecaoValida({ ...m, recorrente: false }, '2026-03-05'), false);
  assert.equal(excecaoValida({ recorrente: true, data: '2026-01-31', dataFim: null }, '2026-02-28'), true); // dia 31 em mês curto
});

test('relogio: "hoje" depende do fuso (22h em Fortaleza já é amanhã em UTC)', () => {
  const instante = new Date('2026-10-31T01:30:00Z'); // 22:30 do dia 30 em Fortaleza
  assert.equal(criarRelogio('America/Fortaleza').hoje(instante), '2026-10-30');
  assert.equal(criarRelogio('UTC').hoje(instante), '2026-10-31');
});
