import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { clickable, focusRing } from '../../components/ui.jsx'
import { useFitCount } from '../../hooks/useFitCount.js'
import MovementRow from './MovementRow.jsx'

const ROW_H = 64 // altura de cada linha da lista (h-16)
const ROW_GAP = 8 // espaço entre linhas (gap-2)

export default function ActiveList({ items, catById, today, editingId, resetKey, onMonths, onEdit, onDelete }) {
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
