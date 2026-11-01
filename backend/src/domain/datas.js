// Utilitários de data (funções puras). Datas são texto "AAAA-MM-DD" (ADR 0003).
// Espelham o front (frontend/src/data/dates.js) mas calculam em UTC, sem depender do fuso da máquina.
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const partes = (iso) => iso.split('-').map(Number);
const pad = (n) => String(n).padStart(2, '0');
const diasDoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // mes de 1 a 12
const montar = (ano, mes, dia) => `${String(ano).padStart(4, '0')}-${pad(mes)}-${pad(dia)}`;

// Existe no calendário? ("2026-02-30" não existe.) Aceita anos de 1900 a 2200.
function dataValida(iso) {
  const m = typeof iso === 'string' && ISO.exec(iso);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return ano >= 1900 && ano <= 2200 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDoMes(ano, mes);
}

const chaveDoMes = (iso) => iso.slice(0, 7); // "AAAA-MM"

// Soma meses mantendo o dia (ou o último dia do mês, quando o dia não existe).
function somarMeses(iso, n) {
  const [ano, mes, dia] = partes(iso);
  const total = ano * 12 + (mes - 1) + n;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return montar(novoAno, novoMes, Math.min(dia, diasDoMes(novoAno, novoMes)));
}

// Meses completos entre duas datas (a segunda é igual ou posterior).
function mesesEntre(a, b) {
  const [ay, am, ad] = partes(a);
  const [by, bm, bd] = partes(b);
  const meses = (by - ay) * 12 + (bm - am);
  return bd < ad ? meses - 1 : meses;
}

// Último dia do mês anterior ao da data ("2026-01-15" -> "2025-12-31").
function ultimoDiaDoMesAnterior(iso) {
  const [ano, mes] = partes(iso);
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  return montar(anoAnterior, mesAnterior, diasDoMes(anoAnterior, mesAnterior));
}

module.exports = { dataValida, chaveDoMes, somarMeses, mesesEntre, ultimoDiaDoMesAnterior };
