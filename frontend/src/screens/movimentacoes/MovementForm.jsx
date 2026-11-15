import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { COLORS } from '../../components/categoryVisuals.js'
import CategoryPicker from '../../components/form/CategoryPicker.jsx'
import Field from '../../components/form/Field.jsx'
import MoneyInput from '../../components/form/MoneyInput.jsx'
import Pills from '../../components/form/Pills.jsx'
import Segmented from '../../components/form/Segmented.jsx'
import { BLUE, BLUE_TEXT, clickable, focusRing, inputCls, tint } from '../../components/ui.jsx'
import { endDateFromMonths } from '../../domain/recurrence.js'
import { MAX_MONTHS, MIN_MONTHS, emptyForm, formFromMovement } from '../../domain/movementForm.js'
import { PAYMENT_METHODS } from '../../domain/paymentMethods.js'
import DurationControl from './DurationControl.jsx'

export default function MovementForm({ categories, editing, onSubmit, onCancelEdit, onCreateCategory }) {
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
