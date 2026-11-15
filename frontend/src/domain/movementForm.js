// Regras do formulário de movimentação: valores iniciais e como uma movimentação vira valores de formulário.
import { todayISO } from './dates.js'
import { durationMonths } from './recurrence.js'

export const MIN_MONTHS = 2
export const MAX_MONTHS = 12

export function emptyForm() {
  return {
    type: 'despesa',
    categoryId: null,
    amount: 0,
    date: todayISO(),
    description: '',
    method: 'PIX',
    recurring: false,
    months: 12,
    indefinite: false,
  }
}

export function formFromMovement(m) {
  return {
    type: m.type,
    categoryId: m.categoryId,
    amount: m.amount,
    date: m.date,
    description: m.description ?? '',
    method: m.method,
    recurring: m.recurring,
    months: durationMonths(m.date, m.endDate) ?? 12,
    indefinite: m.recurring && m.endDate == null,
  }
}
