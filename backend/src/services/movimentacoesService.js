// Service: as regras das movimentações (as mesmas do front, agora garantidas no servidor).
const { AppError } = require('../errors');
const { encerramento, excecaoValida } = require('../domain/recorrencia');

const naoEncontrada = () => new AppError(404, 'not_found', 'Movimentação não encontrada.');
const fimAntesDoInicio = () => new AppError(422, 'invalid_endDate', 'A data de fim não pode ser anterior à data de início.');

// Pontual não tem data de fim; recorrente com fim precisa começar antes dele.
function normalizar(m) {
  const endDate = m.recurring ? m.endDate : null;
  if (endDate && endDate < m.date) throw fimAntesDoInicio();
  return { ...m, endDate };
}

// Descarta exceções de meses que a regra (já alterada) deixou de gerar.
async function limparExcecoes(repo, m) {
  const soltas = (await repo.datasDasExcecoes(m.id)).filter((e) => !excecaoValida({ recorrente: m.recurring, data: m.date, dataFim: m.endDate }, e.data_original));
  await repo.apagarExcecoes(soltas.map((e) => e.id));
}

function criarMovimentacoesService(repo, relogio) {
  return {
    listar: (usuarioId) => repo.listar(usuarioId),

    async criar(usuarioId, dados) {
      const categoria = await repo.buscarCategoria(usuarioId, dados.categoryId);
      if (!categoria) throw new AppError(422, 'invalid_categoryId', 'Escolha uma categoria.');
      if (categoria.sistema) throw new AppError(422, 'invalid_categoryId', 'Essa categoria é de uso do sistema.');
      if (categoria.arquivada) throw new AppError(422, 'invalid_categoryId', 'Essa categoria foi excluída.');
      return repo.criar(usuarioId, categoria, normalizar(dados));
    },

    atualizar(usuarioId, id, mudancas) {
      return repo.transacao(async (tx) => {
        const atual = await tx.buscar(usuarioId, id, { trancar: true });
        if (!atual) throw naoEncontrada();
        const novo = normalizar({ ...atual, ...mudancas });
        const salvo = await tx.atualizar(usuarioId, id, novo);
        await limparExcecoes(tx, salvo);
        return salvo;
      });
    },

    // Pontual: apaga. Recorrência: encerra (meses anteriores ficam no histórico); só apaga de vez
    // quando não sobra mês anterior (ADR 0012). Responde o que aconteceu.
    remover(usuarioId, id) {
      return repo.transacao(async (tx) => {
        const m = await tx.buscar(usuarioId, id, { trancar: true });
        if (!m) throw naoEncontrada();
        if (m.recurring) {
          const r = encerramento({ data: m.date, dataFim: m.endDate }, relogio.hoje());
          if (!r.remover) {
            await tx.encerrar(id, r.dataFim);
            await limparExcecoes(tx, { ...m, endDate: r.dataFim });
            return { ended: true, endDate: r.dataFim };
          }
        }
        await tx.apagar(id);
        return { removed: true };
      });
    },
  };
}

module.exports = { criarMovimentacoesService };
