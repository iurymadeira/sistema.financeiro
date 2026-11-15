// Peças visuais compartilhadas pelas telas novas.
import { categoryColor, categoryIcon } from './categoryVisuals.js'

export const BLUE = '#1a63ff'
export const BLUE_TEXT = '#5b8dff' // azul mais claro, legível como cor de texto sobre fundo escuro

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (cents) => brl.format(cents / 100)
export const tint = (hex, alpha) => `${hex}${alpha}`

export const clickable = 'cursor-pointer disabled:cursor-not-allowed'
export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-white/60'
export const inputCls =
  'h-[var(--ctl)] w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-[#1a63ff] disabled:opacity-40'

export function Avatar({ name, src }) {
  return (
    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-lg font-semibold text-zinc-300">
      {src ? <img src={src} alt={name} className="size-full object-cover" /> : name.charAt(0)}
    </div>
  )
}

export function IconBubble({ category, size = 'size-10', icon = 'size-5' }) {
  const Icon = categoryIcon(category)
  const color = categoryColor(category)
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${size}`} style={{ backgroundColor: tint(color, '1f'), color }}>
      <Icon className={icon} strokeWidth={1.75} />
    </span>
  )
}
