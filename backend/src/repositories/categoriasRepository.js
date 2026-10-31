// Repository: só SQL e tradução banco <-> API. Nenhuma regra de negócio aqui.
// Tradução (ADR 0010): RECEITA/DESPESA no banco, "receita"/"despesa" na API;
// id público = código estável das padrão ("salario") ou o número do banco, como texto, nas do usuário.
const TIPO_PARA_BANCO = { receita: 'RECEITA', despesa: 'DESPESA' };

function paraApi(row) {
  const categoria = {
    id: row.codigo ?? String(row.id),
    name: row.nome,
    type: row.tipo.toLowerCase(),
    icon: row.icone,
  };
  if (row.sistema) categoria.system = true;
  if (row.usuario_id !== null) categoria.custom = true;
  return categoria;
}

function criarCategoriasRepository(pool) {
  return {
    // Padrão + as do usuário. Arquivadas só aparecem se ainda houver lançamentos nelas (ADR 0011).
    async listar(usuarioId) {
      const { rows } = await pool.query(
        `SELECT c.* FROM categorias c
          WHERE (c.usuario_id IS NULL OR c.usuario_id = $1)
            AND (NOT c.arquivada
                 OR EXISTS (SELECT 1 FROM transacoes t WHERE t.categoria_id = c.id AND t.usuario_id = $1))
          ORDER BY c.id`,
        [usuarioId],
      );
      return rows.map(paraApi);
    },

    // O nome já existe, naquele tipo, entre as padrão ou as deste usuário (arquivadas contam)?
    async existeNome(usuarioId, tipo, nome) {
      const { rows } = await pool.query(
        `SELECT 1 FROM categorias
          WHERE (usuario_id IS NULL OR usuario_id = $1) AND tipo = $2 AND lower(nome) = lower($3)`,
        [usuarioId, TIPO_PARA_BANCO[tipo], nome],
      );
      return rows.length > 0;
    },

    async criar(usuarioId, { name, type, icon }) {
      const { rows } = await pool.query(
        `INSERT INTO categorias (usuario_id, nome, icone, tipo) VALUES ($1, $2, $3, $4) RETURNING *`,
        [usuarioId, name, icon, TIPO_PARA_BANCO[type]],
      );
      return paraApi(rows[0]);
    },
  };
}

module.exports = { criarCategoriasRepository };
