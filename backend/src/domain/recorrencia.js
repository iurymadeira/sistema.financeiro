// Regras de recorrência (funções puras). Espelham frontend/src/data/recurrence.js:
// quando uma regra mudar, mude nos dois lados (e nos testes dos dois lados). ADR 0021.
const { chaveDoMes, somarMeses, mesesEntre, ultimoDiaDoMesAnterior } = require('./datas');

// O mês da ocorrência ainda está dentro da recorrência? (só ano e mês importam; fim null = indeterminada)
const dentroDoFim = (data, fim) => fim == null || chaveDoMes(data) <= chaveDoMes(fim);

// Excluir recorrência = ENCERRÁ-LA (ADR 0012): a data de fim vira o último dia do mês anterior ao de hoje.
// Se não sobra nenhum mês anterior ao início, o registro inteiro é removido.
function encerramento({ data, dataFim }, hoje) {
  let fim = ultimoDiaDoMesAnterior(hoje);
  if (dataFim && dataFim < fim) fim = dataFim; // já acabaria antes: não "estica"
  return chaveDoMes(fim) < chaveDoMes(data) ? { remover: true } : { remover: false, dataFim: fim };
}

// Uma exceção só faz sentido se `dataOriginal` é uma data que a regra realmente gera.
function excecaoValida({ recorrente, data, dataFim }, dataOriginal) {
  if (!recorrente) return false;
  const chave = chaveDoMes(dataOriginal);
  if (chave < chaveDoMes(data) || !dentroDoFim(dataOriginal, dataFim)) return false;
  const indice = (Number(chave.slice(0, 4)) - Number(data.slice(0, 4))) * 12 + (Number(chave.slice(5)) - Number(data.slice(5, 7)));
  return somarMeses(data, indice) === dataOriginal;
}

module.exports = { dentroDoFim, encerramento, excecaoValida, mesesEntre };
