import { clickable, focusRing, tint } from '../ui.jsx'

export default function Segmented({ label, options, value, onChange, disabled }) {
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
