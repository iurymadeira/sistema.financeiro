// Senha de acesso PROVISÓRIA (ADR 0026): uma "portaria" na API enquanto não existe login.
// Serve para afastar robôs e curiosos e proteger a cota grátis do banco. NÃO é segurança de verdade:
// todos que souberem a senha veem os mesmos dados. Sai quando o login real entrar.
const crypto = require('node:crypto');
const { AppError } = require('../errors');

const CABECALHO = 'x-access-key';
const MAX_ERROS = 10; // tentativas erradas por janela...
const JANELA_MS = 60_000; // ...de 1 minuto, por endereço (IP)

// Compara sem vazar, pelo tempo de resposta, quantos caracteres estavam certos (timing attack):
// os dois lados viram um hash de mesmo tamanho e a comparação leva o mesmo tempo.
function iguais(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// `senha` vazia/ausente = sem portaria (desenvolvimento local). `agora` existe para os testes controlarem o tempo.
function exigirSenhaDeAcesso(senha, { agora = Date.now } = {}) {
  if (!senha) return (req, res, next) => next();

  const erros = new Map(); // ip -> { quantidade, expiraEm } (some ao reiniciar, e tudo bem)

  return (req, res, next) => {
    const ip = req.ip ?? 'desconhecido';
    const t = agora();
    for (const [chave, e] of erros) if (e.expiraEm <= t) erros.delete(chave); // limpeza: o mapa não cresce sem limite

    const registro = erros.get(ip);
    if (registro && registro.quantidade >= MAX_ERROS) {
      res.set('Retry-After', String(Math.ceil((registro.expiraEm - t) / 1000)));
      return next(new AppError(429, 'too_many_attempts', 'Muitas tentativas erradas. Aguarde um minuto e tente de novo.'));
    }

    const enviada = req.get(CABECALHO);
    if (enviada && iguais(enviada, senha)) return next();

    // Só tentativas ERRADAS contam (quem acertou nunca é bloqueado).
    const atual = registro ?? { quantidade: 0, expiraEm: t + JANELA_MS };
    atual.quantidade += 1;
    erros.set(ip, atual);
    next(new AppError(401, 'access_denied', 'Senha de acesso inválida.'));
  };
}

module.exports = { exigirSenhaDeAcesso, MAX_ERROS, JANELA_MS };
