const db = require('../config/database');

const estadoAplicacaoRepository = {
  async buscar() {
    const [linhas] = await db.execute(
      'SELECT dados FROM estado_aplicacao WHERE id = 1'
    );
    if (linhas.length === 0) return null;
    return typeof linhas[0].dados === 'string'
      ? JSON.parse(linhas[0].dados)
      : linhas[0].dados;
  },

  async salvar(dados) {
    await db.execute(
      `INSERT INTO estado_aplicacao (id, dados)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE dados = VALUES(dados)`,
      [JSON.stringify(dados)]
    );
  },
};

module.exports = estadoAplicacaoRepository;
