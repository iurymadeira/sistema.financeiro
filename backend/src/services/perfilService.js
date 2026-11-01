const { AppError } = require('../errors');

const UNIQUE_VIOLATION = '23505';
const naoEncontrado = () => new AppError(404, 'not_found', 'Usuário não encontrado.');

function criarPerfilService(repo) {
  return {
    async buscar(usuarioId) {
      const perfil = await repo.buscar(usuarioId);
      if (!perfil) throw naoEncontrado();
      return perfil;
    },

    async atualizar(usuarioId, mudancas) {
      try {
        const perfil = await repo.atualizar(usuarioId, mudancas, 'photo' in mudancas);
        if (!perfil) throw naoEncontrado();
        return perfil;
      } catch (err) {
        if (err.code === UNIQUE_VIOLATION) throw new AppError(409, 'email_in_use', 'Esse e-mail já está em uso.');
        throw err;
      }
    },
  };
}

module.exports = { criarPerfilService };
