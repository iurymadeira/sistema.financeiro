// Regras das exceções (ADR 0013): a recorrência continua sendo só a regra; a exceção é uma anotação
// por cima dela, para um mês: outro valor, outra data (no MESMO mês) ou cancelado.
const { AppError } = require('../errors');
const { chaveDoMes, dataValida } = require('../domain/datas');
const { excecaoValida } = require('../domain/recorrencia');

const naoEncontrada = () => new AppError(404, 'not_found', 'Movimentação não encontrada.');

function validarDataOriginal(dataOriginal) {
  if (!dataValida(dataOriginal)) throw new AppError(400, 'invalid_originalDate', 'Data do mês inválida. Use o formato AAAA-MM-DD.');
}

function criarExcecoesService(repo) {
  return {
    listar: (usuarioId) => repo.listarExcecoes(usuarioId),

    // Devolve a exceção gravada, ou null quando o resultado ficou igual à regra (nada fica guardado).
    salvar(usuarioId, id, dataOriginal, { amount, date, cancelled }) {
      validarDataOriginal(dataOriginal);
      return repo.transacao(async (tx) => {
        const m = await tx.buscar(usuarioId, id, { trancar: true });
        if (!m) throw naoEncontrada();
        if (!excecaoValida({ recorrente: m.recurring, data: m.date, dataFim: m.endDate }, dataOriginal)) {
          throw new AppError(422, 'invalid_originalDate', 'Esse mês não faz parte da recorrência.');
        }
        if (!cancelled && date != null && chaveDoMes(date) !== chaveDoMes(dataOriginal)) {
          throw new AppError(422, 'invalid_date', 'A nova data precisa ficar no mesmo mês.');
        }
        const dados = cancelled
          ? { novoValor: null, novaData: null, cancelado: true } // mês cancelado: valor e data são ignorados
          : {
              novoValor: amount != null && amount !== m.amount ? amount : null, // igual à regra = sem exceção
              novaData: date != null && date !== dataOriginal ? date : null,
              cancelado: false,
            };
        if (!dados.cancelado && dados.novoValor === null && dados.novaData === null) {
          await tx.apagarExcecao(id, dataOriginal);
          return null;
        }
        return tx.salvarExcecao(id, { dataOriginal, ...dados });
      });
    },

    // Volta o mês ao que a regra manda. Sem exceção naquele mês, não há o que fazer (idempotente).
    async remover(usuarioId, id, dataOriginal) {
      validarDataOriginal(dataOriginal);
      if (!(await repo.buscar(usuarioId, id))) throw naoEncontrada();
      await repo.apagarExcecao(id, dataOriginal);
    },
  };
}

module.exports = { criarExcecoesService };
