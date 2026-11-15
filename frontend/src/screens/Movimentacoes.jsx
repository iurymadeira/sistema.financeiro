/**
 * Movimentacoes.jsx — Tela "Movimentações e recorrências"
 *
 * Dependências: react, lucide-react, Tailwind CSS (fonte Figtree configurada como font-sans).
 * Dados: src/api/apiRepository.js (via useFinanceData, persistidos pela API).
 */
import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { focusRing } from '../components/ui.jsx'
import { todayISO } from '../domain/dates.js'
import { activeRecurrences } from '../domain/recurrence.js'
import { useFinanceData } from '../hooks/useFinanceData.js'
import MesesDaRecorrencia from './MesesDaRecorrencia.jsx'
import ActiveList from './movimentacoes/ActiveList.jsx'
import MovementForm from './movimentacoes/MovementForm.jsx'

/* ---------- Tela ---------- */

export default function Movimentacoes({ backHref = '/' }) {
  const { movements, categories, create, update, remove, createCategory } = useFinanceData()
  const [editing, setEditing] = useState(null)
  const [resetKey, setResetKey] = useState(0)
  const [monthsOf, setMonthsOf] = useState(null) // recorrência cuja janela de meses está aberta

  const today = todayISO()
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const items = useMemo(() => activeRecurrences(movements, catById, today), [movements, catById, today])

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
