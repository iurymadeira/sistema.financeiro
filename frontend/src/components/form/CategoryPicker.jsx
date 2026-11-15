import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { COLORS, ICON_BANK, ICONS } from '../categoryVisuals.js'
import { BLUE, BLUE_TEXT, IconBubble, clickable, focusRing, inputCls, tint } from '../ui.jsx'

// Seleção de categoria (com criação de nova categoria na hora).
export default function CategoryPicker({ id, categories, type, value, disabled, onChange, onCreate }) {
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
