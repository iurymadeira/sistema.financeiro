// Utilitários de data. Todas as datas do sistema são strings ISO "AAAA-MM-DD"
// (comparáveis como texto) para evitar problemas de fuso horário.

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const pad = (n) => String(n).padStart(2, '0')

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfMonthISO(iso) {
  const d = parseISO(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}

// Soma meses mantendo o dia (ou o último dia do mês, quando ele não existir).
export function addMonths(iso, n) {
  const d = parseISO(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return todayISO(d)
}

// Meses completos entre duas datas (a segunda precisa ser igual ou posterior).
export function monthsBetween(aISO, bISO) {
  const a = parseISO(aISO)
  const b = parseISO(bISO)
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  return b.getDate() < a.getDate() ? months - 1 : months
}

// "14 out" (com o ano quando não é o ano atual)
export function formatShort(iso) {
  const d = parseISO(iso)
  const base = `${pad(d.getDate())} ${MESES[d.getMonth()]}`
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`
}

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Chave de mês "AAAA-MM" a partir de uma data ISO
export const monthKey = (iso) => iso.slice(0, 7)

// Soma meses a uma chave "AAAA-MM"
export function addMonthsKey(key, n) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export const monthShort = (key) => MESES[Number(key.slice(5, 7)) - 1]
export const monthLong = (key) => MESES_LONGOS[Number(key.slice(5, 7)) - 1]
export const monthYear = (key) => `${monthShort(key)} ${key.slice(0, 4)}`
