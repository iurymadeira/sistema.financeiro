import { Check, Minus, Plus } from 'lucide-react'
import { BLUE, BLUE_TEXT, clickable, focusRing, tint } from '../../components/ui.jsx'
import { MAX_MONTHS, MIN_MONTHS } from '../../domain/movementForm.js'

// Duração da recorrência: escolher quantos meses (2 a 12) ou "indeterminado".
export default function DurationControl({ disabled, months, indefinite, onMonths, onIndefinite }) {
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
