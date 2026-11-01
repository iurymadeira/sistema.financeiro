const { AppError } = require('../errors');

// O id da URL vira número no Postgres: algo que não seja dígitos (ou grande demais) nunca existe -> 404.
function idValido(req, res, next) {
  if (!/^\d{1,18}$/.test(req.params.id)) return next(new AppError(404, 'not_found', 'Movimentação não encontrada.'));
  next();
}

module.exports = { idValido };
