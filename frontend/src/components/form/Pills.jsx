import { BLUE, clickable, focusRing } from '../ui.jsx'

export default function Pills({ label, options, value, onChange }) {
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
