// Repository: SQL e tradução banco <-> API. Dinheiro: centavos (API) <-> NUMERIC(12,2) (banco), ADR 0009/0017.
// A conversão acontece DENTRO do SQL (inteiro / 100), nunca com número decimal do JavaScript.
const TIPO_PARA_API = { RECEITA: 'receita', DESPESA: 'despesa' };

const SELECT = `
  SELECT t.id, c.id AS categoria_id, c.codigo, t.tipo,
         (t.valor * 100)::bigint AS centavos, t.data_transacao, t.descricao, t.forma_pagamento,
         t.recorrente, t.data_fim, floor(extract(epoch FROM t.criado_em) * 1000)::bigint AS criado_ms
    FROM transacoes t JOIN categorias c ON c.id = t.categoria_id`;

function paraApi(r) {
  return {
    id: String(r.id),
    type: TIPO_PARA_API[r.tipo],
    categoryId: r.codigo ?? String(r.categoria_id),
    amount: Number(r.centavos),
    date: r.data_transacao,
    description: r.descricao,
    method: r.forma_pagamento,
    recurring: r.recorrente,
    endDate: r.data_fim,
    createdAt: Number(r.criado_ms),
  };
}

// `db` é o pool (cada comando solto) ou um client dentro de uma transação (vários comandos juntos).
function excecaoParaApi(r) {
  return {
    id: String(r.id),
    movementId: String(r.transacao_pai_id),
    originalDate: r.data_original,
    newAmount: r.centavos === null ? null : Number(r.centavos),
    newDate: r.nova_data,
    cancelled: r.cancelado,
  };
}

function criarRepositorio(db, pool) {
  const repo = {
    async listar(usuarioId) {
      const { rows } = await db.query(`${SELECT} WHERE t.usuario_id = $1 ORDER BY t.data_transacao, t.id`, [usuarioId]);
      return rows.map(paraApi);
    },

    // Só devolve se for DESTE usuário (404 para o que não existe e para o que é de outro: ADR 0020/IDOR).
    // `trancar`: dentro de uma transação, impede outra requisição de alterar a mesma linha até terminarmos.
    async buscar(usuarioId, id, { trancar = false } = {}) {
      const { rows } = await db.query(
        `${SELECT} WHERE t.id = $1 AND t.usuario_id = $2 ${trancar ? 'FOR UPDATE OF t' : ''}`,
        [id, usuarioId],
      );
      return rows.length ? paraApi(rows[0]) : null;
    },

    // Categoria que o usuário pode ver (padrão ou dele), pelo id público ("salario" ou "12")
    async buscarCategoria(usuarioId, idPublico) {
      const { rows } = await db.query(
        `SELECT id, tipo, sistema, arquivada FROM categorias
          WHERE (usuario_id IS NULL OR usuario_id = $1) AND (codigo = $2 OR id::text = $2)`,
        [usuarioId, idPublico],
      );
      return rows[0] ?? null;
    },

    async criar(usuarioId, categoria, d) {
      const { rows } = await db.query(
        `INSERT INTO transacoes (usuario_id, categoria_id, forma_pagamento, descricao, valor, tipo, data_transacao, recorrente, data_fim)
         VALUES ($1, $2, $3, $4, ($5::bigint)::numeric / 100, $6, $7, $8, $9) RETURNING id`,
        [usuarioId, categoria.id, d.method, d.description, d.amount, categoria.tipo, d.date, d.recurring, d.endDate],
      );
      return repo.buscar(usuarioId, rows[0].id);
    },

    async atualizar(usuarioId, id, d) {
      await db.query(
        `UPDATE transacoes
            SET valor = ($1::bigint)::numeric / 100, data_transacao = $2, descricao = $3,
                forma_pagamento = $4, recorrente = $5, data_fim = $6
          WHERE id = $7 AND usuario_id = $8`,
        [d.amount, d.date, d.description, d.method, d.recurring, d.endDate, id, usuarioId],
      );
      return repo.buscar(usuarioId, id);
    },

    async encerrar(id, dataFim) {
      await db.query('UPDATE transacoes SET data_fim = $1 WHERE id = $2', [dataFim, id]);
    },

    // As exceções (transacao_excecoes) saem junto, por ON DELETE CASCADE
    async apagar(id) {
      await db.query('DELETE FROM transacoes WHERE id = $1', [id]);
    },

    // ---- Exceções: ajustes de UM mês de uma recorrência (ADR 0013). Vivem junto da movimentação
    // (mesmo "agregado"), por isso compartilham o repositório e a transação.
    async listarExcecoes(usuarioId) {
      const { rows } = await db.query(
        `SELECT e.id, e.transacao_pai_id, e.data_original, e.nova_data, e.cancelado,
                (e.novo_valor * 100)::bigint AS centavos
           FROM transacao_excecoes e JOIN transacoes t ON t.id = e.transacao_pai_id
          WHERE t.usuario_id = $1 ORDER BY e.transacao_pai_id, e.data_original`,
        [usuarioId],
      );
      return rows.map(excecaoParaApi);
    },

    // Um mês, no máximo uma exceção: gravar de novo SUBSTITUI a anterior.
    async salvarExcecao(movimentacaoId, { dataOriginal, novoValor, novaData, cancelado }) {
      const { rows } = await db.query(
        `INSERT INTO transacao_excecoes (transacao_pai_id, data_original, novo_valor, nova_data, cancelado)
         VALUES ($1, $2, CASE WHEN $3::bigint IS NULL THEN NULL ELSE ($3::bigint)::numeric / 100 END, $4, $5)
         ON CONFLICT (transacao_pai_id, data_original)
         DO UPDATE SET novo_valor = EXCLUDED.novo_valor, nova_data = EXCLUDED.nova_data, cancelado = EXCLUDED.cancelado
         RETURNING id, transacao_pai_id, data_original, nova_data, cancelado, (novo_valor * 100)::bigint AS centavos`,
        [movimentacaoId, dataOriginal, novoValor, novaData, cancelado],
      );
      return excecaoParaApi(rows[0]);
    },

    async apagarExcecao(movimentacaoId, dataOriginal) {
      await db.query('DELETE FROM transacao_excecoes WHERE transacao_pai_id = $1 AND data_original = $2', [movimentacaoId, dataOriginal]);
    },

    async datasDasExcecoes(id) {
      const { rows } = await db.query('SELECT id, data_original FROM transacao_excecoes WHERE transacao_pai_id = $1', [id]);
      return rows;
    },

    async apagarExcecoes(ids) {
      if (ids.length) await db.query('DELETE FROM transacao_excecoes WHERE id = ANY($1::bigint[])', [ids]);
    },
  };

  // Roda `trabalho` numa transação: ou tudo vale, ou nada (ex.: ajustar a recorrência E limpar exceções).
  if (pool) {
    repo.transacao = async (trabalho) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const resultado = await trabalho(criarRepositorio(client));
        await client.query('COMMIT');
        return resultado;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  }
  return repo;
}

const criarMovimentacoesRepository = (pool) => criarRepositorio(pool, pool);

module.exports = { criarMovimentacoesRepository };
