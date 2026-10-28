/**
 * Movimentacoes.jsx — Tela "Movimentações e recorrências"
 *
 * Dependências: react, lucide-react, Tailwind CSS (fonte Figtree configurada como font-sans).
 * Dados: src/data/repository.js (persistidos pela API do backend).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Minus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { COLORS, ICON_BANK, ICONS, categoryColor, categoryIcon } from '../data/categories.js'
import { addMonths, formatShort, startOfMonthISO, todayISO } from '../data/dates.js'
import {
  displayDate,
  durationMonths,
  endDateFromMonths,
  endOfRecurrence,
  isActive,
  nextOccurrence,
  occurrencesSoFar,
} from '../data/recurrence.js'
import { useFinanceData } from '../hooks/useFinanceData.js'
import MesesDaRecorrencia from './MesesDaRecorrencia.jsx'
import Link from 'next/link'

const BLUE = '#1a63ff'
export const BLUE_TEXT = '#5b8dff'
export const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Boleto', 'Crédito', 'Débito']
const MIN_MONTHS = 2
const MAX_MONTHS = 12
const ROW_H = 64 // altura de cada linha da lista (h-16)
const ROW_GAP = 8 // espaço entre linhas (gap-2)

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const money = (cents) => brl.format(cents / 100)
const tint = (hex, alpha) => `${hex}${alpha}`

const clickable = 'cursor-pointer disabled:cursor-not-allowed'
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-white/60'
export const inputCls =
  'h-[var(--ctl)] w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#1a63ff] disabled:opacity-40'

/* ---------- Peças pequenas ---------- */

function IconBubble({ category, size = 'size-10', icon = 'size-5' }) {
  const Icon = categoryIcon(category)
  const color = categoryColor(category)
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${size}`}
      style={{ backgroundColor: tint(color, '1f'), color }}
    >
      <Icon className={icon} strokeWidth={1.75} />
    </span>
  )
}

export function Field({ label, htmlFor, children }) {
  const Tag = htmlFor ? 'label' : 'span'
  return (
    <div className="flex flex-col gap-2">
      <Tag htmlFor={htmlFor} className="text-sm text-zinc-400">
        {label}
      </Tag>
      {children}
    </div>
  )
}

export function Segmented({ label, options, value, onChange, disabled }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex h-[var(--ctl)] rounded-full border border-white/10 bg-white/5 p-1 ${disabled ? 'opacity-60' : ''}`}
    >
      {options.map((o) => {
        const active = o.value === value
        const color = o.color ?? '#ffffff'
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full text-sm font-medium transition-colors ${clickable} ${focusRing} ${
              active ? '' : 'text-zinc-400 hover:text-white'
            }`}
            style={
              active
                ? { backgroundColor: tint(color, '26'), color, boxShadow: `inset 0 0 0 1px ${tint(color, '66')}` }
                : undefined
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Pills({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex min-h-[var(--ctl)] flex-wrap items-center gap-2">
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${clickable} ${focusRing} ${
              active
                ? 'border-transparent text-white'
                : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/25'
            }`}
            style={active ? { backgroundColor: BLUE } : undefined}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export function MoneyInput({ id, value, onChange }) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={value > 0 ? money(value) : ''}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
        onChange(digits ? parseInt(digits, 10) : 0)
      }}
      className={`${inputCls} text-base font-semibold tabular-nums`}
    />
  )
}

/* ---------- Seleção de categoria (com criação de novas) ---------- */

export function CategoryPicker({ id, categories, type, value, disabled, onChange, onCreate }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_BANK[0])
  const [error, setError] = useState('')
  const rootRef = useRef(null)

  const color = COLORS[type]
  // A categoria "Ajuste Financeiro" (system) nunca aparece aqui
  const options = categories.filter((c) => c.type === type && !c.system)
  const selected = categories.find((c) => c.id === value)

  const close = () => {
    setOpen(false)
    setCreating(false)
    setError('')
  }

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const submitNew = async () => {
    try {
      const created = await onCreate({ name, type, icon })
      onChange(created.id)
      setName('')
      close()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center gap-3 text-left ${clickable}`}
      >
        {selected ? (
          <>
            <IconBubble category={selected} size="size-7" icon="size-4" />
            <span className="flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-zinc-500">Escolher categoria</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-3xl border border-white/10 bg-[#111114] p-3 shadow-2xl shadow-black/60">
          {creating ? (
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                value={name}
                maxLength={24}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitNew()
                  }
                }}
                placeholder="Nome da categoria"
                aria-label="Nome da nova categoria"
                className={inputCls}
              />
              <div role="radiogroup" aria-label="Ícone da categoria" className="grid grid-cols-8 gap-1.5">
                {ICON_BANK.map((key) => {
                  const Icon = ICONS[key]
                  const active = key === icon
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={key}
                      onClick={() => setIcon(key)}
                      className={`grid aspect-square place-items-center rounded-xl border transition-colors ${clickable} ${focusRing} ${
                        active ? '' : 'border-transparent text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                      style={
                        active
                          ? { backgroundColor: tint(color, '1f'), borderColor: tint(color, '88'), color }
                          : undefined
                      }
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-zinc-500">
                {type === 'despesa' ? 'Despesas usam ícones vermelhos.' : 'Receitas usam ícones verdes.'}
              </p>
              {error && (
                <p role="alert" className="text-xs" style={{ color: COLORS.despesa }}>
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    setError('')
                  }}
                  className={`h-9 rounded-full border border-white/10 px-4 text-sm text-zinc-300 hover:bg-white/10 ${clickable} ${focusRing}`}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={submitNew}
                  className={`h-9 rounded-full px-4 text-sm font-medium text-white disabled:opacity-40 ${clickable} ${focusRing}`}
                  style={{ backgroundColor: BLUE }}
                >
                  Criar categoria
                </button>
              </div>
            </div>
          ) : (
            <>
              <ul role="listbox" aria-label="Categorias" className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto">
                {options.map((c) => (
                  <li key={c.id} role="option" aria-selected={c.id === value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(c.id)
                        close()
                      }}
                      className={`flex h-11 w-full items-center gap-2.5 rounded-2xl border px-2.5 text-left text-sm transition-colors ${clickable} ${focusRing} ${
                        c.id === value ? 'border-white/25 bg-white/10' : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <IconBubble category={c} size="size-7" icon="size-4" />
                      <span className="truncate">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={`mt-2 flex h-10 w-full items-center gap-2 rounded-2xl px-3 text-sm hover:bg-white/5 ${clickable} ${focusRing}`}
                style={{ color: BLUE_TEXT }}
              >
                <Plus className="size-4" strokeWidth={1.75} />
                Nova categoria
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- Duração da recorrência ---------- */

function DurationControl({ disabled, months, indefinite, onMonths, onIndefinite }) {
  const stepperOff = disabled || indefinite
  const stepBtn = `grid size-8 place-items-center rounded-full text-zinc-300 hover:bg-white/10 disabled:opacity-30 ${clickable} ${focusRing}`
  return (
    <div className={`flex h-[var(--ctl)] items-center gap-2 ${disabled ? 'opacity-40' : ''}`}>
      <div
        className={`flex h-[var(--ctl)] items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1 ${
          indefinite ? 'opacity-40' : ''
        }`}
      >
        <button
          type="button"
          aria-label="Diminuir meses"
          disabled={stepperOff || months <= MIN_MONTHS}
          onClick={() => onMonths(months - 1)}
          className={stepBtn}
        >
          <Minus className="size-4" strokeWidth={1.75} />
        </button>
        <span className="w-[4.5rem] text-center text-sm tabular-nums" aria-live="polite">
          {months} meses
        </span>
        <button
          type="button"
          aria-label="Aumentar meses"
          disabled={stepperOff || months >= MAX_MONTHS}
          onClick={() => onMonths(months + 1)}
          className={stepBtn}
        >
          <Plus className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={indefinite}
        disabled={disabled}
        onClick={() => onIndefinite(!indefinite)}
        className={`flex h-[var(--ctl)] items-center gap-1.5 rounded-full border px-4 text-sm transition-colors ${clickable} ${focusRing} ${
          indefinite ? '' : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/25'
        }`}
        style={
          indefinite
            ? { backgroundColor: tint(BLUE, '26'), borderColor: tint(BLUE, '99'), color: BLUE_TEXT }
            : undefined
        }
      >
        {indefinite && <Check className="size-4" strokeWidth={2} />}
        Indeterminado
      </button>
    </div>
  )
}

/* ---------- Formulário ---------- */

function emptyForm() {
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

function formFromMovement(m) {
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

function MovementForm({ categories, editing, onSubmit, onCancelEdit, onCreateCategory }) {
  const [form, setForm] = useState(() => (editing ? formFromMovement(editing) : emptyForm()))
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const timer = useRef(null)

  useEffect(() => {
    setForm(editing ? formFromMovement(editing) : emptyForm())
  }, [editing])

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const valid = form.amount > 0 && Boolean(form.categoryId) && Boolean(form.date)

  const flash = (text) => {
    setNotice(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(''), 2400)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    try {
      await onSubmit({
        ...form,
        description: form.description.trim(),
        endDate: form.recurring && !form.indefinite ? endDateFromMonths(form.date, form.months) : null,
      })
      if (!editing) setForm((f) => ({ ...emptyForm(), type: f.type }))
      flash(editing ? 'Alterações salvas' : 'Movimentação salva')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      // Altura dos campos: 44px em telas baixas, crescendo até 60px em telas mais altas
      style={{ '--ctl': 'clamp(2.75rem, calc(2.75rem + (100dvh - 768px) * 0.2), 3.75rem)' }}
      className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#0C0C0E] p-6"
    >
      <div className="flex min-h-9 items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium leading-tight">{editing ? 'Editar movimentação' : 'Nova movimentação'}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {editing ? 'Tipo e categoria ficam fixos ao editar.' : 'Registre uma entrada ou saída, pontual ou recorrente.'}
          </p>
        </div>
        {editing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3.5 text-sm text-zinc-300 hover:bg-white/10 ${clickable} ${focusRing}`}
          >
            <X className="size-4" strokeWidth={1.75} />
            Cancelar edição
          </button>
        ) : (
          notice && (
            <span
              role="status"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm"
              style={{ color: COLORS.receita, borderColor: tint(COLORS.receita, '55'), backgroundColor: tint(COLORS.receita, '14') }}
            >
              <Check className="size-4" strokeWidth={2} />
              {notice}
            </span>
          )
        )}
      </div>

      <div className="mt-6 grid flex-1 gap-x-6 gap-y-4 md:grid-cols-2">
        {/* Coluna 1 */}
        <div className="flex flex-col justify-between gap-4">
          <Field label="Tipo">
            <Segmented
              label="Tipo"
              value={form.type}
              disabled={Boolean(editing)}
              onChange={(type) => set({ type, categoryId: null })}
              options={[
                { value: 'receita', label: 'Receita', color: COLORS.receita },
                { value: 'despesa', label: 'Despesa', color: COLORS.despesa },
              ]}
            />
          </Field>
          <Field label="Categoria" htmlFor="mov-categoria">
            <CategoryPicker
              id="mov-categoria"
              categories={categories}
              type={form.type}
              value={form.categoryId}
              disabled={Boolean(editing)}
              onChange={(categoryId) => set({ categoryId })}
              onCreate={onCreateCategory}
            />
          </Field>
          <Field label="Valor" htmlFor="mov-valor">
            <MoneyInput id="mov-valor" value={form.amount} onChange={(amount) => set({ amount })} />
          </Field>
          <Field label="Data" htmlFor="mov-data">
            <input
              id="mov-data"
              type="date"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
              className={`${inputCls} [color-scheme:dark]`}
            />
          </Field>
        </div>

        {/* Coluna 2 */}
        <div className="flex flex-col justify-between gap-4">
          <Field label="Método de pagamento">
            <Pills label="Método de pagamento" options={PAYMENT_METHODS} value={form.method} onChange={(method) => set({ method })} />
          </Field>
          <Field label="Descrição" htmlFor="mov-descricao">
            <input
              id="mov-descricao"
              value={form.description}
              maxLength={60}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Ex.: Mercado do mês"
              autoComplete="off"
              className={inputCls}
            />
          </Field>
          <Field label="Movimentação">
            <Segmented
              label="Movimentação"
              value={form.recurring ? 'recorrente' : 'pontual'}
              onChange={(v) => set({ recurring: v === 'recorrente' })}
              options={[
                { value: 'pontual', label: 'Pontual', color: BLUE_TEXT },
                { value: 'recorrente', label: 'Recorrente', color: BLUE_TEXT },
              ]}
            />
          </Field>
          <Field label={form.recurring ? 'Duração (repete todo mês)' : 'Duração (só para recorrentes)'}>
            <DurationControl
              disabled={!form.recurring}
              months={form.months}
              indefinite={form.indefinite}
              onMonths={(months) => set({ months: Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, months)) })}
              onIndefinite={(indefinite) => set({ indefinite })}
            />
          </Field>
        </div>
      </div>

      <button
        type="submit"
        disabled={!valid || saving}
        className={`mt-5 h-12 w-full rounded-full text-base font-semibold text-white transition-opacity disabled:opacity-40 ${clickable} ${focusRing}`}
        style={{ backgroundColor: BLUE }}
      >
        {editing ? 'Salvar alterações' : 'Salvar movimentação'}
      </button>
    </form>
  )
}

/* ---------- Lista de ativas ---------- */

// Quantas linhas cabem na altura disponível, para a tela nunca precisar rolar
function useFitCount(rowHeight, gap) {
  const ref = useRef(null)
  const [count, setCount] = useState(5)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => setCount(Math.max(1, Math.floor((el.clientHeight + gap) / (rowHeight + gap))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [rowHeight, gap])
  return [ref, count]
}

function MovementRow({ m, category, today, editingId, confirming, onMonths, onEdit, onAskDelete, onCancelDelete, onDelete }) {
  const color = categoryColor(category)
  const title = m.description || category.name

  if (confirming) {
    return (
      <li
        className="flex h-16 items-center gap-3 rounded-2xl border px-4"
        style={{ borderColor: tint(COLORS.despesa, '66'), backgroundColor: tint(COLORS.despesa, '12') }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            Excluir <span className="font-semibold">{title}</span>?
          </p>
          {m.recurring && (
            <p className="truncate text-xs text-zinc-400">
              {endOfRecurrence(m, today).remove
                ? 'Ela começou neste mês, então será removida por completo.'
                : 'Os meses anteriores continuam no histórico.'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancelDelete}
          className={`h-8 rounded-full border border-white/15 px-3.5 text-xs text-zinc-200 hover:bg-white/10 ${clickable} ${focusRing}`}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={`h-8 rounded-full px-3.5 text-xs font-semibold text-white ${clickable} ${focusRing}`}
          style={{ backgroundColor: COLORS.despesa }}
        >
          Excluir
        </button>
      </li>
    )
  }

  const n = occurrencesSoFar(m, today)
  let sub = `${category.name} · ${m.method} · ${formatShort(m.date)}`
  let tag = 'Pontual'
  if (m.recurring) {
    sub = n > 0 ? `${category.name} · ${m.method} · próx. ${formatShort(nextOccurrence(m, today))}` : `${category.name} · ${m.method} · começa ${formatShort(m.date)}`
    tag = m.endDate == null ? 'Mensal · indeterminado' : `Mensal · ${n}/${durationMonths(m.date, m.endDate)}`
  }

  return (
    <li
      className="flex h-16 items-center gap-3 rounded-2xl border bg-white/[0.03] px-3"
      style={{ borderColor: editingId === m.id ? BLUE : 'rgba(255,255,255,0.1)' }}
    >
      <IconBubble category={category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-zinc-400">{sub}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums" style={{ color }}>
          {m.type === 'receita' ? '+' : '−'} {money(m.amount)}
        </p>
        <p className="text-xs text-zinc-500">{tag}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {m.recurring && (
          <button
            type="button"
            aria-label={`Ver meses de ${title}`}
            title="Alterar ou cancelar um mês"
            onClick={onMonths}
            className={`grid size-8 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 ${clickable} ${focusRing}`}
          >
            <CalendarDays className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          aria-label={`Editar ${title}`}
          onClick={onEdit}
          className={`grid size-8 place-items-center rounded-full border border-white/10 text-zinc-300 hover:bg-white/10 ${clickable} ${focusRing}`}
        >
          <Pencil className="size-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label={`Excluir ${title}`}
          onClick={onAskDelete}
          className={`grid size-8 place-items-center rounded-full border border-white/10 text-zinc-300 hover:border-[#fc0303]/50 hover:bg-[#fc0303]/10 hover:text-[#fc0303] ${clickable} ${focusRing}`}
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  )
}

function ActiveList({ items, catById, today, editingId, resetKey, onMonths, onEdit, onDelete }) {
  const [listRef, perPage] = useFitCount(ROW_H, ROW_GAP)
  const [page, setPage] = useState(0)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => {
    setPage(0)
  }, [resetKey])

  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(page, pages - 1)
  const start = current * perPage
  const visible = items.slice(start, start + perPage)

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-[#0C0C0E] p-6">
      <div className="flex min-h-9 items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium leading-tight">Recorrências ativas</h2>
          <p className="mt-1 text-sm text-zinc-400">Lançamentos que se repetem todo mês.</p>
        </div>
        <span className="flex h-9 shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-3.5 text-sm tabular-nums text-zinc-300">
          {items.length}
        </span>
      </div>

      <div ref={listRef} className="mt-4 h-[26rem] overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        {visible.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-zinc-500">
            <div className="flex flex-col items-center gap-2">
              <Inbox className="size-8" strokeWidth={1.25} />
              <p>Nenhuma recorrência ativa.</p>
              <p className="text-xs">Cadastre uma movimentação recorrente ao lado.</p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((m) => (
              <MovementRow
                key={m.id}
                m={m}
                category={catById[m.categoryId]}
                today={today}
                editingId={editingId}
                confirming={confirmId === m.id}
                onMonths={() => {
                  setConfirmId(null)
                  onMonths(m)
                }}
                onEdit={() => {
                  setConfirmId(null)
                  onEdit(m)
                }}
                onAskDelete={() => setConfirmId(m.id)}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => {
                  setConfirmId(null)
                  onDelete(m)
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex h-9 items-center justify-between text-sm text-zinc-400">
        <span className="tabular-nums">
          {items.length === 0 ? '0 itens' : `${start + 1}–${start + visible.length} de ${items.length}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className={`grid size-9 place-items-center rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 ${clickable} ${focusRing}`}
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            className={`grid size-9 place-items-center rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-30 ${clickable} ${focusRing}`}
          >
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </section>
  )
}

/* ---------- Tela ---------- */

export default function Movimentacoes({ backHref = '/' }) {
  const { movements, categories, create, update, remove, createCategory } = useFinanceData()
  const [editing, setEditing] = useState(null)
  const [resetKey, setResetKey] = useState(0)
  const [monthsOf, setMonthsOf] = useState(null) // recorrência cuja janela de meses está aberta

  const today = todayISO()
  const monthStart = startOfMonthISO(today)
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  // Só entram recorrências ativas (pontuais ficam para o histórico) e nunca as do sistema (Ajuste Financeiro aparece apenas no histórico)
  const active = useMemo(
    () =>
      movements
        .filter((m) => catById[m.categoryId] && !catById[m.categoryId].system && m.recurring && isActive(m, today, monthStart))
        .sort(
          (a, b) =>
            displayDate(b, today).localeCompare(displayDate(a, today)) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
        ),
    [movements, catById, today, monthStart],
  )

  const items = active

  const handleSubmit = async (values) => {
    if (editing) {
      const { amount, date, description, method, recurring, endDate } = values
      await update(editing.id, { amount, date, description, method, recurring, endDate })
      setEditing(null)
    } else {
      await create(values)
    }
    setResetKey((k) => k + 1)
  }

  const handleDelete = async (m) => {
    if (editing?.id === m.id) setEditing(null)
    await remove(m.id)
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-black px-[3%] py-[4dvh] font-sans text-white antialiased lg:h-dvh lg:min-h-[640px]">
      <header className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            aria-label="Voltar ao início"
            className={`grid size-12 place-items-center rounded-full border border-white/10 bg-[#0C0C0E] text-zinc-300 transition-colors hover:bg-white/10 ${focusRing}`}
          >
            <ArrowLeft className="size-5" strokeWidth={1.5} />
          </Link>
          <h1 className="text-[clamp(1.5rem,2.2vw,2.5rem)] font-semibold leading-tight tracking-tight">
            Movimentações <span className="text-zinc-500">e recorrências</span>
          </h1>
        </div>
      </header>

      <div className="mt-[3dvh] grid flex-1 grid-cols-1 gap-5 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-1">
        <div className="lg:col-span-7">
          <MovementForm
            categories={categories}
            editing={editing}
            onSubmit={handleSubmit}
            onCancelEdit={() => setEditing(null)}
            onCreateCategory={createCategory}
          />
        </div>
        <div className="lg:col-span-5 lg:min-h-0">
          <ActiveList
            items={items}
            catById={catById}
            today={today}
            editingId={editing?.id}
            resetKey={resetKey}
            onMonths={setMonthsOf}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        </div>
      </div>
      {monthsOf && catById[monthsOf.categoryId] && (
        <MesesDaRecorrencia
          movement={movements.find((x) => x.id === monthsOf.id) ?? monthsOf}
          category={catById[monthsOf.categoryId]}
          onClose={() => setMonthsOf(null)}
        />
      )}
    </main>
  )
}
