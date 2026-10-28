/**
 * MovimentacaoRapida.jsx — Janela "Movimentação rápida"
 *
 * Cadastro rápido de uma movimentação pontual. A data é sempre a do cadastro (hoje).
 * É uma janela (modal) que abre por cima da tela atual: renderize quando ela deve aparecer
 * e use `onClose` para fechar.
 *
 *   {open && <MovimentacaoRapida onClose={() => setOpen(false)} />}
 *
 * Dependências: react, lucide-react, Tailwind CSS (fonte Figtree configurada como font-sans).
 * Dados: src/data/repository.js (via useFinanceData).
 */
import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { COLORS } from '../data/categories.js'
import { formatShort, todayISO } from '../data/dates.js'
import { useFinanceData } from '../hooks/useFinanceData.js'
import { BLUE, clickable, focusRing, money, tint } from '../components/ui.jsx'
import { CategoryPicker, Field, MoneyInput, PAYMENT_METHODS, Pills, Segmented } from './Movimentacoes.jsx'

const emptyForm = (type = 'despesa') => ({ type, categoryId: null, amount: 0, description: '', method: 'PIX' })

export default function MovimentacaoRapida({ onClose, onSaved }) {
  const { categories, create, createCategory } = useFinanceData()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null) // resumo do que acabou de ser salvo
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const valid = form.amount > 0 && Boolean(form.categoryId)
  const today = todayISO()

  // Esc fecha; o foco entra na janela e volta para onde estava ao fechar
  useEffect(() => {
    const previous = document.activeElement
    const onKey = (e) => e.key === 'Escape' && closeRef.current?.()
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('#rapida-valor')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previous?.focus?.()
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      const category = categories.find((c) => c.id === form.categoryId)
      const created = await create({
        categoryId: form.categoryId,
        amount: form.amount,
        date: today, // sempre a data do cadastro
        description: form.description.trim(),
        method: form.method,
        recurring: false,
        endDate: null,
      })
      setSaved({ type: form.type, amount: form.amount, categoryName: category?.name ?? '' })
      onSaved?.(created)
    } catch (err) {
      setError(err.message || 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  const another = () => {
    setForm((f) => emptyForm(f.type))
    setSaved(null)
    requestAnimationFrame(() => dialogRef.current?.querySelector('#rapida-valor')?.focus())
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
        aria-labelledby="rapida-titulo"
        // Altura dos campos: 44px em telas baixas, crescendo um pouco em telas mais altas
        style={{ '--ctl': 'clamp(2.75rem, calc(2.75rem + (100dvh - 768px) * 0.12), 3.25rem)' }}
        className="w-full max-w-[28rem] rounded-3xl border border-white/10 bg-[#0C0C0E] p-6 shadow-2xl shadow-black"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="rapida-titulo" className="text-lg font-medium leading-tight">
              Movimentação rápida
            </h2>
            <p className="mt-1 text-sm text-zinc-400">Pontual, registrada com a data de hoje ({formatShort(today)}).</p>
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

        {saved ? (
          <div className="flex flex-col items-center py-8 text-center" role="status">
            <span
              className="grid size-16 place-items-center rounded-full"
              style={{ backgroundColor: tint(COLORS.receita, '1f'), color: COLORS.receita }}
            >
              <Check className="size-8" strokeWidth={2} />
            </span>
            <p className="mt-5 text-lg font-medium">{saved.type === 'receita' ? 'Receita registrada' : 'Despesa registrada'}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {money(saved.amount)} em {saved.categoryName}
            </p>
            <div className="mt-8 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={another}
                className={`h-12 w-full rounded-full text-base font-semibold text-white ${clickable} ${focusRing}`}
                style={{ backgroundColor: BLUE }}
              >
                Registrar outra
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`h-12 w-full rounded-full border border-white/10 text-base text-zinc-300 transition-colors hover:bg-white/10 ${clickable} ${focusRing}`}
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <Field label="Tipo">
              <Segmented
                label="Tipo"
                value={form.type}
                onChange={(type) => set({ type, categoryId: null })}
                options={[
                  { value: 'receita', label: 'Receita', color: COLORS.receita },
                  { value: 'despesa', label: 'Despesa', color: COLORS.despesa },
                ]}
              />
            </Field>
            <Field label="Categoria" htmlFor="rapida-categoria">
              <CategoryPicker
                id="rapida-categoria"
                categories={categories}
                type={form.type}
                value={form.categoryId}
                onChange={(categoryId) => set({ categoryId })}
                onCreate={createCategory}
              />
            </Field>
            <Field label="Valor" htmlFor="rapida-valor">
              <MoneyInput id="rapida-valor" value={form.amount} onChange={(amount) => set({ amount })} />
            </Field>
            <Field label="Descrição (opcional)" htmlFor="rapida-descricao">
              <input
                id="rapida-descricao"
                value={form.description}
                maxLength={60}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Ex.: Almoço"
                autoComplete="off"
                className="h-[var(--ctl)] w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-[#1a63ff]"
              />
            </Field>
            <Field label="Método de pagamento">
              <Pills label="Método de pagamento" options={PAYMENT_METHODS} value={form.method} onChange={(method) => set({ method })} />
            </Field>

            {error && (
              <p role="alert" className="text-sm" style={{ color: COLORS.despesa }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!valid || saving}
              className={`mt-2 h-12 w-full rounded-full text-base font-semibold text-white transition-opacity disabled:opacity-40 ${clickable} ${focusRing}`}
              style={{ backgroundColor: BLUE }}
            >
              {form.type === 'receita' ? 'Registrar receita' : 'Registrar despesa'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
