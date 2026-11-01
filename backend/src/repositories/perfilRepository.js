// Repository do perfil: só SQL e tradução banco <-> API.
const paraApi = (r) => ({ id: String(r.id), name: r.nome, email: r.email, photo: r.foto });

function criarPerfilRepository(pool) {
  return {
    async buscar(usuarioId) {
      const { rows } = await pool.query('SELECT id, nome, email, foto FROM usuarios WHERE id = $1', [usuarioId]);
      return rows.length ? paraApi(rows[0]) : null;
    },

    // COALESCE mantém o que não veio; a foto é tratada à parte porque `null` significa "remover".
    async atualizar(usuarioId, { name, email, photo }, trocarFoto) {
      const { rows } = await pool.query(
        `UPDATE usuarios SET nome = COALESCE($2, nome), email = COALESCE($3, email),
                foto = CASE WHEN $5 THEN $4 ELSE foto END
          WHERE id = $1 RETURNING id, nome, email, foto`,
        [usuarioId, name ?? null, email ?? null, photo ?? null, trocarFoto],
      );
      return rows.length ? paraApi(rows[0]) : null;
    },
  };
}

module.exports = { criarPerfilRepository };
