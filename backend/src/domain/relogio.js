// "Que dia é hoje?" para quem usa o sistema. O servidor costuma rodar em UTC: às 22h em Fortaleza
// já é "amanhã" em UTC, e excluir uma recorrência nesse horário encerraria no mês errado.
// Por isso a data de hoje é calculada no fuso do APP (padrão: America/Sao_Paulo; sem horário de verão desde 2019).
const FUSO_PADRAO = 'America/Sao_Paulo';

function criarRelogio(fuso = process.env.APP_TIMEZONE || FUSO_PADRAO) {
  const formato = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' });
  return { hoje: (agora = new Date()) => formato.format(agora) }; // en-CA formata como AAAA-MM-DD
}

module.exports = { criarRelogio };
