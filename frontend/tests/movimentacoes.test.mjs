// Regras da tela de Movimentações (antes viviam dentro do Movimentacoes.jsx e não tinham teste).
import test from 'node:test'
import assert from 'node:assert/strict'
import { activeRecurrences } from '../src/domain/recurrence.js'
import { MAX_MONTHS, MIN_MONTHS, emptyForm, formFromMovement } from '../src/domain/movementForm.js'
import { todayISO } from '../src/domain/dates.js'

const HOJE = '2026-11-15'
const mov = (id, over = {}) => ({ id, type: 'despesa', categoryId: 'c', amount: 1000, method: 'PIX', recurring: true, date: '2026-01-05', endDate: null, createdAt: 0, ...over })
const cats = { c: { id: 'c', name: 'Moradia', system: false }, s: { id: 's', name: 'Ajuste Financeiro', system: true } }
const ids = (lista) => lista.map((m) => m.id)

test('lista só recorrências ativas: tira pontuais, encerradas, categoria do sistema e categoria desconhecida', () => {
  const lista = activeRecurrences(
    [
      mov('ativa'),
      mov('pontual', { recurring: false, date: '2026-11-10' }),
      mov('encerrada', { endDate: '2026-03-05' }), // 3 meses, já cobrou 11
      mov('ajuste', { categoryId: 's' }),
      mov('sem-categoria', { categoryId: 'inexistente' }),
    ],
    cats,
    HOJE,
  )
  assert.deepEqual(ids(lista), ['ativa'])
})

test('recorrência com fim no futuro continua ativa; a que ainda não começou também', () => {
  const lista = activeRecurrences([mov('ate-dez', { date: '2026-09-05', endDate: '2026-12-05' }), mov('futura', { date: '2027-01-05' })], cats, HOJE)
  assert.deepEqual(ids(lista).sort(), ['ate-dez', 'futura'])
})

test('ordem: data exibida mais recente primeiro; empate desempata por createdAt (mais novo primeiro)', () => {
  const lista = activeRecurrences(
    [
      mov('a', { date: '2026-01-05', createdAt: 1 }), // última cobrança: 05/11
      mov('b', { date: '2026-09-20' }), //               dia 20 ainda não chegou em 15/11: última cobrança foi 20/10
      mov('c', { date: '2026-11-05', createdAt: 2 }), // última cobrança: 05/11 (empata com a)
      mov('h', { date: '2026-12-05' }), //               ainda não começou: mostra a data de início
    ],
    cats,
    HOJE,
  )
  assert.deepEqual(ids(lista), ['h', 'c', 'a', 'b'])
})

test('não altera a lista recebida', () => {
  const entrada = [mov('x', { date: '2026-01-05' }), mov('y', { date: '2026-09-20' })]
  const copia = structuredClone(entrada)
  activeRecurrences(entrada, cats, HOJE)
  assert.deepEqual(entrada, copia)
})

test('formulário novo: valores iniciais', () => {
  assert.deepEqual(emptyForm(), {
    type: 'despesa', categoryId: null, amount: 0, date: todayISO(), description: '', method: 'PIX', recurring: false, months: 12, indefinite: false,
  })
  assert.ok(MIN_MONTHS < MAX_MONTHS)
})

test('movimentação vira formulário: duração, indeterminado e descrição vazia', () => {
  const comFim = formFromMovement(mov('r', { date: '2026-01-05', endDate: '2026-06-05' }))
  assert.equal(comFim.months, 6)
  assert.equal(comFim.indefinite, false)
  const indet = formFromMovement(mov('i', { endDate: null, description: null }))
  assert.equal(indet.indefinite, true)
  assert.equal(indet.months, 12)
  assert.equal(indet.description, '')
  const pontual = formFromMovement(mov('p', { recurring: false, endDate: null }))
  assert.equal(pontual.indefinite, false)
  assert.equal(pontual.recurring, false)
})
