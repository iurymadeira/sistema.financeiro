// Service: as REGRAS. Não sabe o que é HTTP (req/res) nem escreve SQL.
const { AppError } = require('../errors');

const UNIQUE_VIOLATION = '23505'; // código do Postgres para "violou um índice único"
const jaExiste = () => new AppError(409, 'category_exists', 'Já existe uma categoria com esse nome.');

function criarCategoriasService(repo) {
  return {
    listar: (usuarioId) => repo.listar(usuarioId),

    async criar(usuarioId, dados) {
      if (await repo.existeNome(usuarioId, dados.type, dados.name)) throw jaExiste();
      try {
        return await repo.criar(usuarioId, dados);
      } catch (err) {
        // Duas requisições iguais ao mesmo tempo passam pela checagem acima; quem barra é o índice único do banco.
        if (err.code === UNIQUE_VIOLATION) throw jaExiste();
        throw err;
      }
    },
  };
}

module.exports = { criarCategoriasService };
