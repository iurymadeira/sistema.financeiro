// Erro "esperado": a regra de negócio ou a validação disse não, e já sabemos o que responder.
// Contrato (docs/api.md): { "error": { "code": "...", "message": "..." } } com o status HTTP certo.
class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { AppError };
