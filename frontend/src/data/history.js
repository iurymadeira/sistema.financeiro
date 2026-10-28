// Cálculos do Histórico financeiro (funções puras: recebem os lançamentos e devolvem números).
//
// Regras:
// - Pontual conta no mês da sua data; recorrente conta uma vez por mês, a partir da data inicial
//   e até acabar a duração (ou sem fim, se indeterminada).
// - Só entra o que já aconteceu (data até hoje).
// - "Ajuste Financeiro" (do sistema) entra normalmente: o histórico é o único lugar onde aparece.

import { addMonthsKey, monthKey } from './dates.js'
import { applyException, findException, originalDateAt, withinEnd } from './recurrence.js'

// Transforma lançamentos (inclusive recorrentes) em ocorrências datadas, até hoje.
// `exceptions` são os ajustes de um mês específico de uma recorrência (valor/data novos ou mês cancelado).
export function expandOccurrences(movements, today, exceptions = []) {
  const out = []
  for (const m of movements) {
    if (!m.recurring) {
      if (m.date <= today) out.push({ id: m.id, type: m.type, categoryId: m.categoryId, amount: m.amount, date: m.date })
      continue
    }
    // Uma ocorrência por mês, do início até o mês de hoje ou a data de fim (o que vier primeiro).
    // Percorre por MÊS (e não por data) porque uma exceção pode mover o dia dentro do mês.
    for (let i = 0; ; i++) {
      const originalDate = originalDateAt(m, i)
      if (monthKey(originalDate) > monthKey(today) || !withinEnd(originalDate, m.endDate)) break
      const applied = applyException(m, originalDate, findException(exceptions, m.id, originalDate))
      if (!applied || applied.date > today) continue // cancelada, ou ainda não chegou o dia
      out.push({ id: `${m.id}#${i}`, type: m.type, categoryId: m.categoryId, amount: applied.amount, date: applied.date })
    }
  }
  return out
}

// Últimos `count` meses terminando no mês de `today`: ["2026-05", ..., "2026-10"]
export function lastMonthKeys(today, count) {
  const end = monthKey(today)
  return Array.from({ length: count }, (_, i) => addMonthsKey(end, i - (count - 1)))
}

// Totais de receita e despesa de cada mês
export function monthlyTotals(occurrences, keys) {
  const byKey = Object.fromEntries(keys.map((k) => [k, { key: k, receita: 0, despesa: 0 }]))
  for (const o of occurrences) {
    const row = byKey[monthKey(o.date)]
    if (row) row[o.type] += o.amount
  }
  return keys.map((k) => byKey[k])
}

// Ranking de categorias (maior para menor) de um tipo, dentro dos meses informados
export function rankCategories(occurrences, keys, type) {
  const set = new Set(keys)
  const sums = new Map()
  for (const o of occurrences) {
    if (o.type !== type || !set.has(monthKey(o.date))) continue
    sums.set(o.categoryId, (sums.get(o.categoryId) ?? 0) + o.amount)
  }
  return [...sums.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export const sum = (rows, field) => rows.reduce((acc, r) => acc + r[field], 0)

// Saldo da conta: tudo que entrou menos tudo que saiu (inclui o "Ajuste Financeiro")
export const currentBalance = (occurrences) =>
  occurrences.reduce((acc, o) => acc + (o.type === 'receita' ? o.amount : -o.amount), 0)

// Resumo do mês atual para o Dashboard (tudo em centavos).
// `variation` é a variação do saldo no mês, em %, ou null quando o saldo no início do mês não era positivo.
export function monthSummary(movements, today, exceptions = []) {
  const occ = expandOccurrences(movements, today, exceptions)
  const key = monthKey(today)
  const inMonth = occ.filter((o) => monthKey(o.date) === key)
  const sumType = (type) => inMonth.filter((o) => o.type === type).reduce((acc, o) => acc + o.amount, 0)
  const balance = currentBalance(occ)
  const monthNet = currentBalance(inMonth)
  const start = balance - monthNet
  return {
    balance,
    income: sumType('receita'),
    expenses: sumType('despesa'),
    variation: start > 0 ? Math.round((monthNet / start) * 100) : null,
  }
}
