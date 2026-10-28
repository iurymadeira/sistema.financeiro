/**
 * Historico.jsx — Tela "Histórico financeiro"
 *
 * Dependências: react, lucide-react, Tailwind CSS (fonte Figtree configurada como font-sans).
 * Dados: src/data/repository.js (via useFinanceData) e src/data/history.js (cálculos).
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Inbox, X } from 'lucide-react'
import { COLORS, categoryColor } from '../data/categories.js'
import { monthLong, monthShort, todayISO } from '../data/dates.js'
import { expandOccurrences, lastMonthKeys, monthlyTotals, rankCategories, sum } from '../data/history.js'
import { useFinanceData } from '../hooks/useFinanceData.js'
import { BLUE, IconBubble, clickable, focusRing, money } from '../components/ui.jsx'
import Link from 'next/link'

const PERIODS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '1 ano' },
]
const LABEL_H = 'h-9' // altura da linha com os nomes dos meses
const ROW_H = 52 // altura de cada linha do ranking
const ROW_GAP = 14

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const longLabel = (key) => `${cap(monthLong(key))} de ${key.slice(0, 4)}`
const shortLabel = (key) => `${monthShort(key)} ${key.slice(0, 4)}`

/* ---------- Eixo do gráfico ---------- */

// Maior valor "redondo" (em centavos) que comporta os dados em 4 divisões iguais
function niceMax(maxCents) {
  const max = Math.max(maxCents / 100, 1)
  const base = 10 ** Math.floor(Math.log10(max / 4))
  for (const f of [1, 2, 2.5, 5, 10]) {
    if (f * base * 4 >= max) return f * base * 4 * 100
  }
  return max * 100
}

function axisLabel(cents) {
  const reais = cents / 100
  if (reais >= 1000) return `R$ ${(reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

// Quantas linhas de ranking cabem na altura disponível
function useFitRows() {
  const ref = useRef(null)
  const [rows, setRows] = useState(6)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => setRows(Math.max(1, Math.floor((el.clientHeight + ROW_GAP) / (ROW_H + ROW_GAP))))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, rows]
}

/* ---------- Gráfico de barras: receitas x despesas por mês ---------- */

function Tooltip({ month, index, count }) {
  const saldo = month.receita - month.despesa
  // Aparece ao lado do mês (nunca por cima das barras dele)
  const side = index < count / 2 ? 'left-full ml-2' : 'right-full mr-2'
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute z-30 w-52 rounded-2xl border border-white/10 bg-zinc-900 p-3 text-xs shadow-xl shadow-black/60 top-2 ${side}`}
    >
      <p className="mb-2 text-sm font-medium text-white">{longLabel(month.key)}</p>
      {[
        ['Receitas', COLORS.receita, money(month.receita)],
        ['Despesas', COLORS.despesa, money(month.despesa)],
      ].map(([label, color, value]) => (
        <p key={label} className="flex items-center justify-between gap-2 py-0.5 text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-[3px]" style={{ backgroundColor: color }} />
            {label}
          </span>
          <span className="tabular-nums text-white">{value}</span>
        </p>
      ))}
      <p className="mt-1.5 flex justify-between gap-2 border-t border-white/10 pt-1.5 text-zinc-400">
        <span>Saldo</span>
        <span className="tabular-nums text-white">
          {saldo < 0 ? '−' : ''}
          {money(Math.abs(saldo))}
        </span>
      </p>
      <p className="mt-1.5 text-zinc-500">Clique para ver as categorias</p>
    </div>
  )
}

function MonthChart({ months, selected, onSelect }) {
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(...months.flatMap((m) => [m.receita, m.despesa]), 0))
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i)
  const hasSelection = selected != null

  return (
    <div className="relative flex h-full min-h-0 flex-1 pt-3">
      <div className="flex w-[4.5rem] shrink-0 flex-col" aria-hidden="true">
        <div className="relative flex-1">
          {ticks.map((t, i) => (
            <span
              key={t}
              className="absolute right-3 translate-y-1/2 whitespace-nowrap text-xs tabular-nums text-zinc-500"
              style={{ bottom: `${i * 25}%` }}
            >
              {axisLabel(t)}
            </span>
          ))}
        </div>
        <div className={LABEL_H} />
      </div>

      <div className="relative flex min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-9" aria-hidden="true">
          {ticks.map((t, i) => (
            <div key={t} className="absolute inset-x-0 border-t border-white/[0.06]" style={{ bottom: `${i * 25}%` }} />
          ))}
        </div>

        {months.map((m, i) => {
          const isSel = selected === m.key
          const dim = hasSelection && !isSel
          const showYear = i === 0 || m.key.endsWith('-01')
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={isSel}
              aria-label={`${longLabel(m.key)}: receitas ${money(m.receita)}, despesas ${money(m.despesa)}`}
              onClick={() => onSelect(isSel ? null : m.key)}
              onMouseEnter={() => setHover(m.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(m.key)}
              onBlur={() => setHover(null)}
              className={`relative ${hover === m.key ? 'z-30' : 'z-10'} flex min-w-0 flex-1 flex-col rounded-2xl transition-colors ${clickable} ${focusRing} ${
                isSel ? 'bg-white/[0.07]' : 'hover:bg-white/5'
              }`}
            >
              <span className="flex min-h-0 flex-1 items-end justify-center gap-1 px-1.5">
                {[
                  ['receita', m.receita, COLORS.receita],
                  ['despesa', m.despesa, COLORS.despesa],
                ].map(([k, v, color]) => (
                  <span
                    key={k}
                    className="w-full max-w-7 rounded-t-[4px] transition-opacity"
                    style={{
                      height: v > 0 ? `max(${(v / max) * 100}%, 3px)` : 0,
                      backgroundColor: color,
                      opacity: dim ? 0.4 : 1,
                    }}
                  />
                ))}
              </span>
              <span
                className={`flex ${LABEL_H} items-center justify-center text-xs ${
                  isSel ? 'font-semibold text-white' : 'text-zinc-400'
                }`}
              >
                {isSel ? (
                  <span className="rounded-full px-2.5 py-1" style={{ backgroundColor: BLUE }}>
                    {monthShort(m.key)}
                  </span>
                ) : (
                  <>
                    {monthShort(m.key)}
                    {showYear && <span className="ml-1 text-zinc-600">’{m.key.slice(2, 4)}</span>}
                  </>
                )}
              </span>
              {hover === m.key && <Tooltip month={m} index={i} count={months.length} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Ranking de categorias ---------- */

function RankRow({ item, category, max, total }) {
  const color = categoryColor(category)
  return (
    <li className="flex items-center gap-3" style={{ height: ROW_H }}>
      <IconBubble category={category} size="size-10" icon="size-5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm text-zinc-200">{category.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-zinc-500">{Math.round((item.amount / total) * 100)}%</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 min-w-6 flex-1 rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full" style={{ width: `${Math.max((item.amount / max) * 100, 2)}%`, backgroundColor: color }} />
          </div>
          <span className="w-[6.25rem] shrink-0 text-right text-sm font-medium tabular-nums">{money(item.amount)}</span>
        </div>
      </div>
    </li>
  )
}

function OthersRow({ items }) {
  const total = items.reduce((a, i) => a + i.amount, 0)
  return (
    <li className="flex items-center gap-3" style={{ height: ROW_H }}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-medium text-zinc-300">+{items.length}</span>
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
        <span className="truncate text-sm text-zinc-400">Outras categorias</span>
        <span className="shrink-0 text-sm font-medium tabular-nums text-zinc-300">{money(total)}</span>
      </div>
    </li>
  )
}

function RankColumn({ title, color, total, ranking, catById, rows, listRef }) {
  const max = ranking[0]?.amount ?? 1
  // Se não couber tudo, as menores se juntam em "Outras categorias"
  const fits = ranking.length <= rows
  const shown = fits ? ranking : ranking.slice(0, Math.max(rows - 1, 0))
  const rest = fits ? [] : ranking.slice(shown.length)

  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="h-[4.25rem] shrink-0">
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
          {title}
        </p>
        <p className="mt-1 text-[clamp(1.25rem,1.6vw,1.75rem)] font-semibold leading-tight tabular-nums">{money(total)}</p>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-hidden">
        {ranking.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-zinc-500">
            <div className="flex flex-col items-center gap-2">
              <Inbox className="size-7" strokeWidth={1.25} />
              <p>Nada neste período.</p>
            </div>
          </div>
        ) : (
          <ol className="flex flex-col" style={{ gap: ROW_GAP }}>
            {shown.map((item) => (
              <RankRow key={item.categoryId} item={item} category={catById[item.categoryId]} max={max} total={total} />
            ))}
            {rest.length > 0 && <OthersRow items={rest} />}
          </ol>
        )}
      </div>
    </div>
  )
}

/* ---------- Pequenas peças ---------- */

function Stat({ label, color, value, signed }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-sm text-zinc-400">
        {color && <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: color }} />}
        {label}
      </p>
      <p className="mt-1 truncate text-[clamp(1.25rem,1.9vw,2.25rem)] font-semibold leading-tight tracking-tight tabular-nums">
        {signed && value > 0 ? '+' : value < 0 ? '−' : ''}
        {money(Math.abs(value))}
      </p>
    </div>
  )
}

function PeriodSwitch({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Período" className="flex shrink-0 gap-2">
      {PERIODS.map((p) => {
        const active = p.value === value
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.value)}
            className={`flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors ${clickable} ${focusRing} ${
              active ? 'border-transparent text-white' : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/25'
            }`}
            style={active ? { backgroundColor: BLUE } : undefined}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Tela ---------- */

export default function Historico({ backHref = '/' }) {
  const { movements, categories, exceptions } = useFinanceData()
  const [months, setMonths] = useState(6)
  const [selected, setSelected] = useState(null)
  const [listRef, rows] = useFitRows()

  const today = todayISO()
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const occurrences = useMemo(() => expandOccurrences(movements, today, exceptions), [movements, exceptions, today])
  const keys = useMemo(() => lastMonthKeys(today, months), [today, months])
  const series = useMemo(() => monthlyTotals(occurrences, keys), [occurrences, keys])

  const receitas = sum(series, 'receita')
  const despesas = sum(series, 'despesa')

  // Ranking: do mês clicado ou, sem seleção, de todo o período
  const scope = selected && keys.includes(selected) ? [selected] : keys
  const scoped = selected && keys.includes(selected) ? series.find((s) => s.key === selected) : { receita: receitas, despesa: despesas }
  const rankIn = (type) => rankCategories(occurrences, scope, type).filter((r) => catById[r.categoryId])

  const changePeriod = (value) => {
    setMonths(value)
    setSelected(null)
  }

  const periodText = `${shortLabel(keys[0])} – ${shortLabel(keys[keys.length - 1])}`
  const periodName = months === 12 ? 'Último ano' : `Últimos ${months} meses`
  const monthSelected = scope.length === 1
  const unit = monthSelected ? 'no mês' : 'no período'

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
            Histórico <span className="text-zinc-500">financeiro</span>
          </h1>
        </div>
      </header>

      <div className="mt-[3dvh] grid flex-1 grid-cols-1 gap-5 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-1">
        {/* Gráfico comparativo */}
        <section className="flex min-h-[32rem] flex-col rounded-3xl border border-white/10 bg-[#0C0C0E] p-6 lg:col-span-7 lg:min-h-0">
          <div className="flex min-h-9 items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium leading-tight">Receitas e despesas</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {monthSelected ? `${longLabel(scope[0])} · ${periodName.toLowerCase()}` : `${periodName} · ${periodText}`}
              </p>
            </div>
            <PeriodSwitch value={months} onChange={changePeriod} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <Stat label={`Receitas ${unit}`} color={COLORS.receita} value={scoped.receita} />
            <Stat label={`Despesas ${unit}`} color={COLORS.despesa} value={scoped.despesa} />
            <Stat label={`Saldo ${unit}`} value={scoped.receita - scoped.despesa} signed />
          </div>

          <div className="mt-6 flex h-[20rem] min-h-0 flex-col lg:h-auto lg:flex-1">
            <MonthChart months={series} selected={selected} onSelect={setSelected} />
          </div>

          <div className="sr-only">
          <table>
            <caption>Receitas e despesas por mês</caption>
            <thead>
              <tr><th>Mês</th><th>Receitas</th><th>Despesas</th></tr>
            </thead>
            <tbody>
              {series.map((m) => (
                <tr key={m.key}><td>{longLabel(m.key)}</td><td>{money(m.receita)}</td><td>{money(m.despesa)}</td></tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* Ranking de categorias */}
        <section className="flex min-h-[32rem] flex-col rounded-3xl border border-white/10 bg-[#0C0C0E] p-6 lg:col-span-5 lg:min-h-0">
          <div className="flex min-h-9 items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium leading-tight">Categorias</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {scope.length === 1 ? longLabel(scope[0]) : `${periodName} · do maior ao menor`}
              </p>
            </div>
            {scope.length === 1 ? (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 pl-3.5 pr-3 text-sm text-zinc-200 transition-colors hover:border-white/25 ${clickable} ${focusRing}`}
              >
                Ver {periodName.toLowerCase()}
                <X className="size-3.5" strokeWidth={2} />
              </button>
            ) : (
              <span className="hidden h-9 items-center text-sm text-zinc-500 2xl:flex">Clique em um mês no gráfico</span>
            )}
          </div>

          <div className="mt-6 grid min-h-0 flex-1 grid-cols-2 gap-6">
            <RankColumn title="Receitas" color={COLORS.receita} total={scoped.receita} ranking={rankIn('receita')} catById={catById} rows={rows} listRef={listRef} />
            <RankColumn title="Despesas" color={COLORS.despesa} total={scoped.despesa} ranking={rankIn('despesa')} catById={catById} rows={rows} listRef={null} />
          </div>
        </section>
      </div>
    </main>
  )
}
