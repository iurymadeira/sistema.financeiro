const db = require('../config/database');

// PROVISÓRIO (some quando o front passar a usar a API relacional).
const estadoAplicacaoRepository = {
  async buscar() {
    const { rows } = await db.query('SELECT dados FROM estado_aplicacao WHERE id = 1');
    return rows.length === 0 ? null : rows[0].dados; // JSONB já volta como objeto
  },

  async salvar(dados) {
    await db.query(
      `INSERT INTO estado_aplicacao (id, dados) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now()`,
      [JSON.stringify(dados)]
    );
  },
};

module.exports = estadoAplicacaoRepository;
