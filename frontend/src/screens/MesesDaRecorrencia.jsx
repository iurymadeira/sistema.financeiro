/**
 * MesesDaRecorrencia.jsx — Janela "Meses" de uma recorrência
 *
 * Mostra cada mês da recorrência (passados e os próximos 12) e permite, para UM mês só:
 *   - alterar o valor e/ou o dia;
 *   - cancelar a cobrança daquele mês;
 *   - voltar ao que a regra manda.
 * A recorrência em si não muda: isso são "exceções" (ADR 0013).
 *
 *   {open && <MesesDaRecorrencia movement={m} category={c} onClose={...} />}
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Ban, Check, ChevronLeft, ChevronRight, Pencil, Undo2, X } from 'lucide-react'
import { COLORS, categoryColor } from '../data/categories.js'
import { monthKey, monthShort, pad, todayISO } from '../data/dates.js'
import { listRecurrenceMonths } from '../data/recurrence.js'
import { useFinanceData } from '../hooks/useFinanceData.js'
import { BLUE, IconBubble, clickable, focusRing, money, tint } from '../components/ui.jsx'
import { MoneyInput, inputCls } from './Movimentacoes.jsx'

const PER_PAGE = 6
const dayOf = (iso) => Number(iso.slice(8, 10))
const lastDayOf = (key) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate()
const monthLabel = (key) => `${monthShort(key)} ${key.slice(0, 4)}`

function MonthRow({ row, color, thisMonth, type, editing, saving, onEdit, onCancelEdit, onSave, onToggleCancel, onRestore }) {
  const [amount, setAmount] = useState(row.amount)
  const [day, setDay] = useState(String(dayOf(row.date)))
  const maxDay = lastDayOf(row.key)
  const dayNumber = Number(day)
  const validDay = Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= maxDay
  const valid = amount > 0 && validDay
  const sign = type === 'receita' ? '+' : '−'

  if (editing) {
    return (
      <li className="flex h-14 items-center gap-2 rounded-2xl border bg-white/[0.03] px-3" style={{ borderColor: BLUE }}>
        <span className="w-[4.25rem] shrink-0 text-sm font-medium capitalize">{monthLabel(row.key)}</span>
        <div className="min-w-0 flex-1" style={{ '--ctl': '2.25rem' }}>
          <MoneyInput id={`mes-valor-${row.key}`} value={amount} onChange={setAmount} />
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
          dia
          <input
            aria-label={`Dia em ${monthLabel(row.key)}`}
            inputMode="numeric"
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            className={`${inputCls} !w-12 px-0 text-center tabular-nums`}
            style={{ '--ctl': '2.25rem' }}
            aria-invalid={!validDay}
          />
        </label>
        <button
          type="button"
          aria-label="Salvar este mês"
          disabled={!valid || saving}
          onClick={() => onSave({ amount, date: `${row.key}-${pad(dayNumber)}` })}
          className={`grid size-8 shrink-0 place-items-center rounded-full text-white disabled:opacity-40 ${clickable} ${focusRing}`}
          style={{ backgroundColor: BLUE }}
        >
          <Check className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Descartar alteração"
          onClick={onCancelEdit}
          className={`grid size-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 ${clickable} ${focusRing}`}
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </li>
    )
  }

  const modified = row.cancelled || row.changed
  return (
    <li
      className="flex h-14 items-center gap-2 rounded-2xl border bg-white/[0.03] px-3"
      style={{ borderColor: row.cancelled ? tint(COLORS.despesa, '55') : row.changed ? tint(BLUE, '88') : 'rgba(255,255,255,0.1)' }}
    >
      <div className="w-[4.25rem] shrink-0">
        <p className="text-sm font-medium capitalize">{monthLabel(row.key)}</p>
        <p className="text-xs text-zinc-500">{row.past ? 'já passou' : thisMonth ? 'este mês' : 'previsto'}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold tabular-nums ${row.cancelled ? 'text-zinc-500 line-through' : ''}`}
          style={row.cancelled ? undefined : { color }}
        >
          {sign} {money(row.amount)}
        </p>
        <p className="truncate text-xs text-zinc-400">
          {row.cancelled ? (
            <span style={{ color: COLORS.despesa }}>Cancelado neste mês</span>
          ) : (
            <>
              dia {pad(dayOf(row.date))}
              {row.changed && <span className="text-[#5b8dff]"> · alterado (regra: {money(row.ruleAmount)})</span>}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {modified && (
          <button
            type="button"
            aria-label={`Voltar ${monthLabel(row.key)} ao valor da regra`}
            title="Voltar ao que a regra manda"
            onClick={onRestore}
            className={`grid size-8 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 ${clickable} ${focusRing}`}
          >
            <Undo2 className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
        {!row.cancelled && (
          <button
            type="button"
            aria-label={`Alterar ${monthLabel(row.key)}`}
            title="Alterar valor ou dia"
            onClick={() => {
              setAmount(row.amount)
              setDay(String(dayOf(row.date)))
              onEdit()
            }}
            className={`grid size-8 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 ${clickable} ${focusRing}`}
          >
            <Pencil className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
        {!row.cancelled && (
          <button
            type="button"
            aria-label={`Cancelar ${monthLabel(row.key)}`}
            title="Cancelar só este mês"
            onClick={onToggleCancel}
            className={`grid size-8 place-items-center rounded-full border border-white/10 text-zinc-300 hover:border-[#fc0303]/50 hover:bg-[#fc0303]/10 hover:text-[#fc0303] ${clickable} ${focusRing}`}
          >
            <Ban className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </li>
  )
}

export default function MesesDaRecorrencia({ movement, category, onClose }) {
  const { exceptions, saveException, removeException } = useFinanceData()
  const today = todayISO()
  const rows = useMemo(() => listRecurrenceMonths(movement, exceptions, today, 12), [movement, exceptions, today])
  const firstCurrent = Math.max(0, rows.findIndex((r) => !r.past))
  const [page, setPage] = useState(() => Math.floor((firstCurrent === -1 ? 0 : firstCurrent) / PER_PAGE))
  const [editingKey, setEditingKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const current = Math.min(page, pages - 1)
  const visible = rows.slice(current * PER_PAGE, (current + 1) * PER_PAGE)
  const title = movement.description || category.name

  // Esc fecha (ou, com um mês em edição, só descarta a edição); foco entra e volta ao fechar
  const editingRef = useRef(null)
  editingRef.current = editingKey
  useEffect(() => {
    const previous = document.activeElement
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (editingRef.current) setEditingKey(null)
      else closeRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previous?.focus?.()
    }
  }, [])

  const run = async (fn) => {
    setSaving(true)
    setError('')
    try {
      await fn()
      setEditingKey(null)
    } catch (err) {
      setError(err.message || 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 font-sans text-white antialiased backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meses-titulo"
        className="w-full max-w-[32rem] rounded-3xl border border-white/10 bg-[#0C0C0E] p-6 shadow-2xl shadow-black"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <IconBubble category={category} />
            <div className="min-w-0">
              <h2 id="meses-titulo" className="truncate text-lg font-medium leading-tight">
                Meses de {title}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">Altere ou cancele um mês sem mexer nos outros.</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className={`grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:bg-white/10 ${clickable} ${focusRing}`}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <ul className="mt-5 flex flex-col gap-2" style={{ minHeight: `${PER_PAGE * 3.5 + (PER_PAGE - 1) * 0.5}rem` }}>
          {visible.map((row) => (
            <MonthRow
              key={row.key}
              row={row}
              color={categoryColor(category)}
              thisMonth={row.key === monthKey(today)}
              type={movement.type}
              editing={editingKey === row.key}
              saving={saving}
              onEdit={() => setEditingKey(row.key)}
              onCancelEdit={() => setEditingKey(null)}
              onSave={(values) => run(() => saveException(movement.id, row.originalDate, values))}
              onToggleCancel={() => run(() => saveException(movement.id, row.originalDate, { cancelled: true }))}
              onRestore={() => run(() => removeException(movement.id, row.originalDate))}
            />
          ))}
        </ul>

        {error && (
          <p role="alert" className="mt-3 text-sm" style={{ color: COLORS.despesa }}>
            {error}
          </p>
        )}

        <div className="mt-4 flex h-9 items-center justify-between text-sm text-zinc-400">
          <span className="tabular-nums">
            Página {current + 1} de {pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Meses anteriores"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
              className={`grid size-9 place-items-center rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 ${clickable} ${focusRing}`}
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Próximos meses"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              className={`grid size-9 place-items-center rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 ${clickable} ${focusRing}`}
            >
              <ChevronRight className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
