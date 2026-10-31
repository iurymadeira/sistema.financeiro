const { AppError } = require('../errors');

// Rota que não existe: mesmo formato de erro das outras (o front trata um formato só).
function naoEncontrado(req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
}

// Ponto ÚNICO onde qualquer erro vira resposta HTTP. Controllers e services só lançam erros.
// O Express 5 repassa para cá também os erros de funções async.
// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  // Erros do express.json(): corpo que não é JSON válido ou grande demais
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'O corpo da requisição não é um JSON válido.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'payload_too_large', message: 'O corpo da requisição é grande demais.' } });
  }
  // Qualquer outra coisa é bug nosso: registramos o detalhe aqui e NÃO o mostramos ao cliente.
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Algo deu errado do nosso lado. Tente novamente.' } });
}

module.exports = { naoEncontrado, tratarErros };
