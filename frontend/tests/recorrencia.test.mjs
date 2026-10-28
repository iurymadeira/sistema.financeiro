// Testes das regras de recorrência. Rodar com: npm test  (usa o executor de testes do próprio Node)
import test from 'node:test'
import assert from 'node:assert/strict'
import { durationMonths, endDateFromMonths, withinEnd } from '../src/data/recurrence.js'
import { expandOccurrences } from '../src/data/history.js'

const rec = (over = {}) => ({ id: 'r', type: 'despesa', categoryId: 'x', amount: 4000, recurring: true, date: '2026-01-05', endDate: null, ...over })

test('duração em meses vira data de fim (e volta)', () => {
  assert.equal(endDateFromMonths('2026-01-05', 12), '2026-12-05')
  assert.equal(durationMonths('2026-01-05', '2026-12-05'), 12)
  assert.equal(endDateFromMonths('2026-01-05', 1), '2026-01-05')
  assert.equal(durationMonths('2026-01-05', '2026-01-05'), 1)
})

test('indeterminada: sem duração e sem data de fim', () => {
  assert.equal(endDateFromMonths('2026-01-05', null), null)
  assert.equal(durationMonths('2026-01-05', null), null)
  assert.equal(withinEnd('2099-01-01', null), true)
})

test('só o mês da data de fim importa, o dia não', () => {
  assert.equal(withinEnd('2026-09-05', '2026-09-30'), true)
  assert.equal(withinEnd('2026-10-05', '2026-09-30'), false)
})

test('dia 31: meses curtos usam o último dia, e a duração continua certa', () => {
  assert.equal(endDateFromMonths('2026-01-31', 2), '2026-02-28')
  assert.equal(durationMonths('2026-01-31', '2026-02-28'), 2)
})

test('recorrência indeterminada gera uma ocorrência por mês até hoje', () => {
  const occ = expandOccurrences([rec()], '2026-10-22')
  assert.equal(occ.length, 10) // jan a out
  assert.equal(occ.at(-1).date, '2026-10-05')
})

test('recorrência com data de fim para na data de fim', () => {
  const occ = expandOccurrences([rec({ endDate: '2026-03-05' })], '2026-10-22')
  assert.deepEqual(occ.map((o) => o.date), ['2026-01-05', '2026-02-05', '2026-03-05'])
})

test('encerrar em setembro mantém janeiro a setembro e some de outubro em diante', () => {
  const occ = expandOccurrences([rec({ endDate: '2026-09-30' })], '2026-10-22')
  assert.equal(occ.length, 9)
  assert.equal(occ.at(-1).date, '2026-09-05')
})

test('ocorrências futuras não entram', () => {
  const occ = expandOccurrences([rec({ date: '2026-12-05' })], '2026-10-22')
  assert.equal(occ.length, 0)
})

test('pontual conta só se a data já chegou', () => {
  const m = rec({ recurring: false, date: '2026-10-10' })
  assert.equal(expandOccurrences([m], '2026-10-22').length, 1)
  assert.equal(expandOccurrences([m], '2026-10-01').length, 0)
})

import { endOfRecurrence } from '../src/data/recurrence.js'

test('excluir recorrência antiga: encerra no último dia do mês anterior', () => {
  assert.deepEqual(endOfRecurrence(rec(), '2026-10-22'), { remove: false, endDate: '2026-09-30' })
})

test('excluir recorrência que começou no mês passado: mantém o mês passado', () => {
  assert.deepEqual(endOfRecurrence(rec({ date: '2026-09-05' }), '2026-10-22'), { remove: false, endDate: '2026-09-30' })
})

test('excluir recorrência criada neste mês: remove por completo', () => {
  assert.deepEqual(endOfRecurrence(rec({ date: '2026-10-05' }), '2026-10-22'), { remove: true })
})

test('excluir recorrência que ainda não começou: remove por completo', () => {
  assert.deepEqual(endOfRecurrence(rec({ date: '2026-12-05' }), '2026-10-22'), { remove: true })
})

test('virada de ano: em janeiro, o mês anterior é dezembro', () => {
  assert.deepEqual(endOfRecurrence(rec({ date: '2025-06-05' }), '2026-01-15'), { remove: false, endDate: '2025-12-31' })
})

test('encerrar e depois expandir: histórico fica até o mês anterior', () => {
  const { endDate } = endOfRecurrence(rec(), '2026-10-22')
  const occ = expandOccurrences([rec({ endDate })], '2026-10-22')
  assert.equal(occ.length, 9) // jan a set; outubro não conta
})

/* ---------- Exceções (A3, ADR 0013) ---------- */
import { applyException, findException, isValidExceptionFor, listRecurrenceMonths } from '../src/data/recurrence.js'

const ex = (over = {}) => ({ id: 'e', movementId: 'r', originalDate: '2026-03-05', newAmount: null, newDate: null, cancelled: false, ...over })
const total = (occ) => occ.reduce((a, o) => a + o.amount, 0)

test('sem exceções, nada muda (a regra manda)', () => {
  const occ = expandOccurrences([rec()], '2026-04-30', [])
  assert.equal(occ.length, 4) // jan, fev, mar, abr
  assert.equal(total(occ), 16000)
})

test('mês cancelado não gera ocorrência e some do total', () => {
  const occ = expandOccurrences([rec()], '2026-04-30', [ex({ cancelled: true })])
  assert.equal(occ.length, 3)
  assert.ok(!occ.some((o) => o.date.startsWith('2026-03')))
})

test('valor novo vale só naquele mês', () => {
  const occ = expandOccurrences([rec()], '2026-04-30', [ex({ newAmount: 9000 })])
  assert.deepEqual(occ.map((o) => o.amount), [4000, 4000, 9000, 4000])
})

test('data nova (no mesmo mês) muda o dia da ocorrência', () => {
  const occ = expandOccurrences([rec()], '2026-04-30', [ex({ newDate: '2026-03-20' })])
  assert.equal(occ.find((o) => o.date.startsWith('2026-03')).date, '2026-03-20')
})

test('mês atual: dia movido para o passado entra, dia movido para o futuro ainda não', () => {
  // regra: dia 5; hoje: dia 10 de março
  const movedBack = ex({ originalDate: '2026-03-05', newDate: '2026-03-02' })
  assert.equal(expandOccurrences([rec()], '2026-03-10', [movedBack]).filter((o) => o.date.startsWith('2026-03')).length, 1)
  const movedAhead = ex({ originalDate: '2026-03-05', newDate: '2026-03-25' })
  assert.equal(expandOccurrences([rec()], '2026-03-10', [movedAhead]).filter((o) => o.date.startsWith('2026-03')).length, 0)
  // e a ocorrência cuja data original ainda não chegou, mas foi antecipada para antes de hoje, entra
  const early = ex({ originalDate: '2026-03-25', newDate: '2026-03-08' })
  assert.equal(expandOccurrences([rec({ date: '2026-01-25' })], '2026-03-10', [early]).filter((o) => o.date.startsWith('2026-03')).length, 1)
})

test('exceção de outra recorrência não interfere', () => {
  const occ = expandOccurrences([rec()], '2026-04-30', [ex({ movementId: 'outra', cancelled: true })])
  assert.equal(occ.length, 4)
})

test('findException compara pelo mês e applyException devolve null quando cancelada', () => {
  const e = ex({ cancelled: true })
  assert.equal(findException([e], 'r', '2026-03-31'), e)
  assert.equal(findException([e], 'r', '2026-04-05'), undefined)
  assert.equal(applyException(rec(), '2026-03-05', e), null)
  assert.deepEqual(applyException(rec(), '2026-03-05', undefined), { date: '2026-03-05', amount: 4000 })
})

test('listRecurrenceMonths: passados e futuros, respeitando fim e exceções', () => {
  const rows = listRecurrenceMonths(rec({ endDate: '2026-06-05' }), [ex({ newAmount: 9000 }), ex({ originalDate: '2026-04-05', cancelled: true })], '2026-03-10', 12)
  assert.equal(rows.length, 6) // jan..jun, parou na data de fim
  assert.equal(rows[2].amount, 9000)
  assert.equal(rows[2].changed, true)
  assert.equal(rows[2].ruleAmount, 4000)
  assert.equal(rows[3].cancelled, true)
  assert.deepEqual(rows.map((r) => r.past), [true, true, false, false, false, false])
})

test('listRecurrenceMonths: indeterminada olha só 12 meses à frente', () => {
  const rows = listRecurrenceMonths(rec(), [], '2026-03-10', 12)
  assert.equal(rows.at(-1).key, '2027-03')
})

test('isValidExceptionFor: só meses que a regra realmente gera', () => {
  const m = rec({ endDate: '2026-06-05' })
  assert.equal(isValidExceptionFor(m, ex()), true)
  assert.equal(isValidExceptionFor(m, ex({ originalDate: '2025-12-05' })), false) // antes do início
  assert.equal(isValidExceptionFor(m, ex({ originalDate: '2026-07-05' })), false) // depois do fim
  assert.equal(isValidExceptionFor(m, ex({ originalDate: '2026-03-06' })), false) // dia não é o da regra
  assert.equal(isValidExceptionFor(rec({ recurring: false }), ex()), false)
})

/* ---------- Regras da lista de recorrências e resumo do Dashboard ---------- */
import { displayDate, isActive, nextOccurrence, occurrencesSoFar } from '../src/data/recurrence.js'
import { monthSummary } from '../src/data/history.js'

test('occurrencesSoFar: conta as cobranças já ocorridas (início em jan, hoje em 10 de mar)', () => {
  assert.equal(occurrencesSoFar(rec(), '2026-03-10'), 3) // jan, fev, mar
  assert.equal(occurrencesSoFar(rec(), '2026-03-04'), 2) // dia 5 de março ainda não chegou
  assert.equal(occurrencesSoFar(rec({ date: '2026-06-05' }), '2026-03-10'), 0) // ainda não começou
  assert.equal(occurrencesSoFar(rec({ recurring: false }), '2026-03-10'), 0)
})

test('isActive: sem fim sempre ativa; com fim, só até acabar; pontual, do mês atual em diante', () => {
  assert.equal(isActive(rec(), '2030-01-01', '2030-01-01'), true)
  const fim = rec({ endDate: '2026-03-05' }) // jan, fev, mar
  assert.equal(isActive(fim, '2026-03-04', '2026-03-01'), true) // falta a de março
  assert.equal(isActive(fim, '2026-03-10', '2026-03-01'), false) // a última já aconteceu
  assert.equal(isActive(rec({ recurring: false, date: '2026-03-20' }), '2026-03-10', '2026-03-01'), true)
  assert.equal(isActive(rec({ recurring: false, date: '2026-02-20' }), '2026-03-10', '2026-03-01'), false)
})

test('nextOccurrence e displayDate', () => {
  assert.equal(nextOccurrence(rec(), '2026-03-10'), '2026-04-05')
  assert.equal(displayDate(rec(), '2026-03-10'), '2026-03-05') // última que ocorreu
  assert.equal(displayDate(rec({ date: '2026-06-05' }), '2026-03-10'), '2026-06-05') // ainda não começou
})

test('monthSummary: saldo, receitas e despesas do mês, e variação', () => {
  const movs = [
    rec({ id: 'sal', type: 'receita', amount: 100000, date: '2026-01-05' }), // jan, fev, mar = 300000
    rec({ id: 'alu', type: 'despesa', amount: 40000, date: '2026-02-10' }), // fev, mar = 80000
  ]
  const s = monthSummary(movs, '2026-03-15', [])
  assert.equal(s.income, 100000)
  assert.equal(s.expenses, 40000)
  assert.equal(s.balance, 300000 - 80000)
  // saldo no início do mês = 220000 - (100000 - 40000) = 160000; variação = 60000/160000 = 37,5% -> 38
  assert.equal(s.variation, 38)
})

test('monthSummary respeita exceções e dá variação nula sem saldo no início do mês', () => {
  const movs = [rec({ id: 's', type: 'receita', amount: 100000, date: '2026-03-05' })]
  const s = monthSummary(movs, '2026-03-15', [])
  assert.equal(s.variation, null)
  const cancelado = monthSummary(movs, '2026-03-15', [{ movementId: 's', originalDate: '2026-03-05', cancelled: true, newAmount: null, newDate: null }])
  assert.equal(cancelado.income, 0)
})
