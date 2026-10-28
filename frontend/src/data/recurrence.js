// Regras de recorrência mensal (funções puras).
//
// Uma recorrência guarda a REGRA, não as ocorrências: valor, data inicial (`date`) e data de fim
// (`endDate`). `endDate = null` significa indeterminada: dura até o usuário encerrar.
// O que vale é o MÊS da data de fim (o dia não importa), igual ao backend (`data_fim`).

import { addMonths, addMonthsKey, monthKey, monthsBetween, parseISO, startOfMonthISO, todayISO } from './dates.js'

// "Durar N meses" (como a tela pergunta) vira a data da última ocorrência.
// Ex.: início 05/01/2026, 12 meses -> 05/12/2026. Sem duração (null) -> sem fim.
export function endDateFromMonths(startISO, months) {
  return months == null ? null : addMonths(startISO, months - 1)
}

// O contrário: quantos meses a recorrência dura (contando o mês de início e o de fim).
// Ex.: início 05/01/2026, fim 05/12/2026 -> 12. Sem fim -> null.
export function durationMonths(startISO, endISO) {
  if (endISO == null) return null
  const [sy, sm] = monthKey(startISO).split('-').map(Number)
  const [ey, em] = monthKey(endISO).split('-').map(Number)
  return (ey - sy) * 12 + (em - sm) + 1
}

// A ocorrência desta data ainda está dentro da recorrência? (compara só ano e mês)
export const withinEnd = (dateISO, endISO) => endISO == null || monthKey(dateISO) <= monthKey(endISO)

// Excluir uma recorrência = ENCERRÁ-LA (ADR 0012): os meses anteriores ao da exclusão continuam no
// histórico; a partir do mês da exclusão ela não conta mais. Ou seja, a data de fim passa a ser o
// último dia do mês anterior. Se não sobra nenhum mês anterior (ela começou neste mês, ou ainda
// nem começou), o registro inteiro é removido.
export function endOfRecurrence(m, todayISOStr) {
  const d = parseISO(startOfMonthISO(todayISOStr))
  d.setDate(0) // dia 0 do mês = último dia do mês anterior
  let endDate = todayISO(d)
  if (m.endDate && m.endDate < endDate) endDate = m.endDate // já acabaria antes: não "estica"
  return monthKey(endDate) < monthKey(m.date) ? { remove: true } : { remove: false, endDate }
}

/* ---------- Situação de uma recorrência hoje (usado pela lista de ativas) ---------- */

// Quantas cobranças já aconteceram até hoje (pela regra, sem contar exceções)
export function occurrencesSoFar(m, today) {
  if (!m.recurring || m.date > today) return 0
  return monthsBetween(m.date, today) + 1
}

// Ativa = pontual do mês atual em diante, ou recorrência que ainda não terminou
export function isActive(m, today, monthStart) {
  if (!m.recurring) return m.date >= monthStart
  if (m.endDate == null) return true
  return occurrencesSoFar(m, today) < durationMonths(m.date, m.endDate)
}

// Data da próxima cobrança
export const nextOccurrence = (m, today) => addMonths(m.date, occurrencesSoFar(m, today))

// Data mostrada na linha da lista: a última cobrança que já ocorreu (ou a data de início, se ainda não começou)
export function displayDate(m, today) {
  if (!m.recurring) return m.date
  const n = occurrencesSoFar(m, today)
  return n > 0 ? addMonths(m.date, n - 1) : m.date
}

/* ---------- Exceções: mexer em UM mês de uma recorrência (ADR 0013) ---------- */
//
// A recorrência continua sendo só a regra. Uma EXCEÇÃO é uma anotação por cima dela, para um mês:
//   { id, movementId, originalDate, newDate, newAmount, cancelled }
// - `originalDate`: a data em que a regra geraria a ocorrência (a "chave" do mês, como no backend);
// - `newAmount` / `newDate`: o que muda naquele mês (null = continua como a regra manda);
// - `cancelled`: naquele mês a cobrança não acontece.
// A nova data precisa ficar no MESMO mês: assim cada mês tem no máximo uma ocorrência.

// Data em que a regra gera a ocorrência de índice `index` (0 = mês de início)
export const originalDateAt = (m, index) => addMonths(m.date, index)

// Acha a exceção de um mês (compara por mês, igual ao resto do sistema)
export const findException = (exceptions, movementId, originalDate) =>
  exceptions.find((e) => e.movementId === movementId && monthKey(e.originalDate) === monthKey(originalDate))

// Aplica a exceção (se houver) a uma ocorrência gerada pela regra. Devolve null se foi cancelada.
export function applyException(m, originalDate, exception) {
  if (exception?.cancelled) return null
  return {
    date: exception?.newDate ?? originalDate,
    amount: exception?.newAmount ?? m.amount,
  }
}

// Todas as ocorrências de uma recorrência para a janela de meses: do início até `horizonMonths`
// meses depois do mês de `today` (ou até a data de fim, o que vier primeiro). Cada linha diz o que
// a regra manda (`ruleAmount`, `originalDate`) e o que vale de fato (`amount`, `date`).
export function listRecurrenceMonths(m, exceptions, today, horizonMonths = 12) {
  const limit = addMonthsKey(monthKey(today), horizonMonths)
  const rows = []
  for (let i = 0; ; i++) {
    const originalDate = originalDateAt(m, i)
    if (!withinEnd(originalDate, m.endDate) || monthKey(originalDate) > limit) break
    const exception = findException(exceptions, m.id, originalDate)
    const applied = applyException(m, originalDate, exception)
    rows.push({
      index: i,
      key: monthKey(originalDate),
      originalDate,
      ruleAmount: m.amount,
      cancelled: applied === null,
      date: applied?.date ?? originalDate,
      amount: applied?.amount ?? m.amount,
      changed: Boolean(exception && !exception.cancelled && (exception.newDate || exception.newAmount != null)),
      past: monthKey(originalDate) < monthKey(today),
    })
  }
  return rows
}

// Uma exceção só faz sentido se o mês dela ainda é um mês da recorrência (depois de mudar o início
// ou o fim da regra, as que ficaram "soltas" são descartadas).
export function isValidExceptionFor(m, exception) {
  if (!m.recurring) return false
  const key = monthKey(exception.originalDate)
  return key >= monthKey(m.date) && withinEnd(exception.originalDate, m.endDate) &&
    originalDateAt(m, monthsBetweenKeys(monthKey(m.date), key)) === exception.originalDate
}

function monthsBetweenKeys(a, b) {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by - ay) * 12 + (bm - am)
}
