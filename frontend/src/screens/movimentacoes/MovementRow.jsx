import { CalendarDays, Pencil, Trash2 } from 'lucide-react'
import { COLORS, categoryColor } from '../../components/categoryVisuals.js'
import { BLUE, IconBubble, clickable, focusRing, money, tint } from '../../components/ui.jsx'
import { formatShort } from '../../domain/dates.js'
import { durationMonths, endOfRecurrence, nextOccurrence, occurrencesSoFar } from '../../domain/recurrence.js'

export default function MovementRow({ m, category, today, editingId, confirming, onMonths, onEdit, onAskDelete, onCancelDelete, onDelete }) {
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
