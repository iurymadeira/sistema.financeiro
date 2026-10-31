const { AppError } = require('../errors');

// PROVISÓRIO (ADR 0020): decide "quem é o usuário desta requisição" e põe em req.usuarioId.
// Hoje é sempre o mesmo usuário fixo (criado na migration 004). Quando entrar o login,
// só ESTE arquivo muda: passa a ler o id da sessão. Controllers, services e repositories
// já usam req.usuarioId, nunca um id vindo do cliente (evita IDOR).
const EMAIL_PADRAO = 'provisorio@local.invalid';

function identificarUsuario(pool, email = EMAIL_PADRAO) {
  let idEmCache = null;
  return async (req, res, next) => {
    try {
      if (idEmCache === null) {
        const { rows } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (!rows.length) {
          throw new AppError(500, 'provisional_user_missing', 'Usuário provisório não encontrado. Rode "npm run migrate".');
        }
        idEmCache = rows[0].id;
      }
      req.usuarioId = idEmCache;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { identificarUsuario };
