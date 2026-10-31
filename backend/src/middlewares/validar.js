const { AppError } = require('../errors');

// validar(schema): confere o corpo da requisição com um esquema Zod ANTES do controller rodar.
// Se passar, req.body vira o dado já limpo (espaços cortados etc.); se não, responde 400.
// O código do erro vem do campo com problema: campo "name" -> "invalid_name" (contrato da API).
function validar(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);
    if (resultado.success) {
      req.body = resultado.data;
      return next();
    }
    const problema = resultado.error.issues[0];
    const campo = problema.path[0];
    const code = campo === undefined ? 'invalid_request' : `invalid_${String(campo)}`;
    next(new AppError(400, code, problema.message));
  };
}

module.exports = { validar };
