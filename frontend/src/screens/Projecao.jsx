/**
 * Projecao.jsx — Tela "Projeção financeira" (simulador de patrimônio)
 *
 * O patrimônio de partida é o saldo da conta do usuário na plataforma (calculado pelos lançamentos).
 * O usuário digita aporte mensal, rentabilidade, prazo e inflação e vê o patrimônio crescer com juros
 * compostos, também em valor de hoje (descontada a inflação). O aporte começa vazio.
 * É uma estimativa, não uma garantia de rentabilidade.
 *
 * Dependências: react, lucide-react, Tailwind CSS (fonte Figtree configurada como font-sans).
 * Dados: src/data/repository.js (via useFinanceData), src/data/history.js e src/data/projection.js.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Flag, Minus, Plus, Target, TrendingDown } from 'lucide-react'
import { COLORS } from '../data/categories.js'
import { todayISO } from '../data/dates.js'
import { currentBalance, expandOccurrences } from '../data/history.js'
import {
  MAX_YEARS,
  compactMoney,
  deflate,
  findMilestones,
  monthsToReach,
  niceMax,
  realReturnPct,
  requiredMonthly,
  simulate,
  spanShort,
  spanText,
} from '../data/projection.js'
import { useFinanceData } from '../hooks/useFinanceData.js'
import { BLUE, clickable, focusRing, money } from '../components/ui.jsx'
import { Field, MoneyInput, inputCls } from './Movimentacoes.jsx'
import Link from 'next/link'

const GREEN = COLORS.receita
const SURFACE = '#0C0C0E'
const AREA_BLUE = 'rgba(26,99,255,0.55)' // mesma cor da área de aportes no gráfico
const AREA_GREEN = 'rgba(3,252,7,0.4)' // mesma cor da área de juros no gráfico
const CELL_H = 'h-[7.5rem]'
const HALO = { paintOrder: 'stroke', stroke: SURFACE, strokeWidth: 4, strokeLinejoin: 'round' }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const reais = (cents) => money(Math.round(cents / 100) * 100).replace(',00', '')

/* ---------- Campos do simulador ---------- */

function RateInput({ id, value, onChange }) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => /^\d{0,2}([.,]\d{0,2})?$/.test(e.target.value) && onChange(e.target.value)}
        className={`${inputCls} pr-20 text-base font-semibold tabular-nums`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">% ao ano</span>
    </div>
  )
}

function YearsInput({ id, value, onChange }) {
  const parsed = clamp(parseInt(value, 10) || 1, 1, MAX_YEARS)
  const step = (d) => onChange(String(clamp(parsed + d, 1, MAX_YEARS)))
  const btn = `grid h-full w-10 shrink-0 place-items-center text-zinc-300 hover:text-white disabled:opacity-30 ${clickable} ${focusRing} rounded-full`
  return (
    <div className="flex h-[var(--ctl)] items-center rounded-2xl border border-white/10 bg-white/5 px-1 transition-colors focus-within:border-[#1a63ff]">
      <button type="button" aria-label="Diminuir prazo" disabled={parsed <= 1} onClick={() => step(-1)} className={btn}>
        <Minus className="size-4" strokeWidth={1.75} />
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => /^\d{0,2}$/.test(e.target.value) && onChange(e.target.value)}
          onBlur={() => onChange(String(parsed))}
          className="w-8 bg-transparent text-center text-base font-semibold tabular-nums text-white outline-none"
        />
        <span className="text-sm text-zinc-500">{parsed === 1 ? 'ano' : 'anos'}</span>
      </div>
      <button type="button" aria-label="Aumentar prazo" disabled={parsed >= MAX_YEARS} onClick={() => step(1)} className={btn}>
        <Plus className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}

/* ---------- Gráfico: aportes x juros ---------- */

const M = { l: 88, r: 16, t: 16, b: 30 } // margens internas do desenho

function GrowthChart({ series, real, meta, milestones, years }) {
  const wrapRef = useRef(null)
  const [size, setSize] = useState({ w: 640, h: 300 })
  const [hover, setHover] = useState(null) // mês sob o mouse

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = years * 12
  const { w, h } = size
  const iw = Math.max(w - M.l - M.r, 10)
  const ih = Math.max(h - M.t - M.b, 10)

  const finalTotal = series.total[n]
  // A meta só entra na escala quando não esmaga o resto do gráfico
  const metaShown = meta > 0 && meta <= finalTotal * 2
  const yMax = niceMax(Math.max(finalTotal, metaShown ? meta : 0))
  const x = (m) => M.l + (m / n) * iw
  const y = (v) => M.t + ih - (v / yMax) * ih

  const line = (arr) => arr.map((v, m) => `${m ? 'L' : 'M'}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const investedArea = `${line(series.invested)}L${x(n).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`
  const interestArea =
    line(series.total) +
    series.invested
      .map((v, i) => [v, i])
      .reverse()
      .map(([v, m]) => `L${x(m).toFixed(1)},${y(v).toFixed(1)}`)
      .join('') +
    'Z'

  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i)
  const stepYears = years <= 10 ? 1 : years <= 20 ? 2 : years <= 30 ? 5 : 10
  const xTicks = []
  for (let yr = 0; yr <= years; yr += stepYears) xTicks.push(yr)

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const m = Math.round(((e.clientX - rect.left - M.l) / iw) * n)
    setHover(clamp(m, 0, n))
  }

  const tip = hover != null && {
    left: x(hover) > w / 2,
    total: series.total[hover],
    invested: series.invested[hover],
    real: real[hover],
  }

  return (
    <div ref={wrapRef} className="relative h-full min-h-0 w-full">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label={`Patrimônio de ${money(series.total[0])} hoje para ${money(finalTotal)} em ${spanText(n)}`}
        className="absolute inset-0 block select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* grade e eixos */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={M.l - 12} y={y(t)} dy="0.32em" textAnchor="end" className="fill-zinc-500 text-[12px] tabular-nums">
              {compactMoney(t)}
            </text>
          </g>
        ))}
        {xTicks.map((yr) => (
          <text key={yr} x={x(yr * 12)} y={h - 8} textAnchor={yr === 0 ? 'start' : yr === years ? 'end' : 'middle'} className="fill-zinc-500 text-[12px]">
            {yr === 0 ? 'Hoje' : yr === years ? `${yr} ${yr === 1 ? 'ano' : 'anos'}` : yr}
          </text>
        ))}

        {/* áreas: o que ele colocou x o que os juros renderam */}
        <path d={investedArea} fill={AREA_BLUE} />
        <path d={interestArea} fill={AREA_GREEN} />
        <path d={line(series.invested)} fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
        <path d={line(series.total)} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" />

        {/* meta */}
        {metaShown && (
          <g>
            <line x1={M.l} x2={w - M.r} y1={y(meta)} y2={y(meta)} stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="5 5" />
            <text x={M.l + 8} y={y(meta) - 7} style={HALO} className="fill-zinc-300 text-[12px]">
              Meta {compactMoney(meta)}
            </text>
          </g>
        )}

        {/* inflação: o mesmo patrimônio em valor de hoje */}
        <g>
          <path d={line(real)} fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
        </g>

        {/* marcos */}
        {milestones.map((ms) => (
          <g key={ms.value}>
            <circle cx={x(ms.month)} cy={y(series.total[ms.month])} r="5" fill="#fff" stroke={SURFACE} strokeWidth="2" />
            <text
              x={x(ms.month)}
              y={y(series.total[ms.month]) - 12}
              textAnchor={x(ms.month) < M.l + 40 ? 'start' : x(ms.month) > w - M.r - 40 ? 'end' : 'middle'}
              style={HALO}
              className="fill-white text-[12px] font-medium"
            >
              {compactMoney(ms.value)}
            </text>
          </g>
        ))}

        {/* cursor */}
        {hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} stroke="rgba(255,255,255,0.35)" />
            <circle cx={x(hover)} cy={y(tip.total)} r="4.5" fill={GREEN} stroke={SURFACE} strokeWidth="2" />
            <circle cx={x(hover)} cy={y(tip.invested)} r="4.5" fill={BLUE} stroke={SURFACE} strokeWidth="2" />
            <circle cx={x(hover)} cy={y(tip.real)} r="4.5" fill="#fff" stroke={SURFACE} strokeWidth="2" />
          </g>
        )}
      </svg>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-60 rounded-2xl border border-white/10 bg-zinc-900 p-3 text-xs shadow-xl shadow-black/60"
          style={{ top: M.t + 4, left: tip.left ? x(hover) - 14 : x(hover) + 14, transform: tip.left ? 'translateX(-100%)' : undefined }}
        >
          <p className="mb-2 text-sm font-medium text-white">{hover === 0 ? 'Hoje' : `Daqui a ${spanText(hover)}`}</p>
          {[
            ['Patrimônio', <span key="d" className="size-2.5 rounded-full" style={{ backgroundColor: GREEN }} />, tip.total, true],
            ['Aportes', <span key="d" className="size-2.5 rounded-full" style={{ backgroundColor: BLUE }} />, tip.invested],
          ].map(([label, mark, value, bold]) => (
            <p key={label} className="flex items-center justify-between gap-2 py-0.5 text-zinc-400">
              <span className="flex items-center gap-2">
                {mark}
                {label}
              </span>
              <span className={`tabular-nums ${bold ? 'font-semibold text-white' : 'text-zinc-200'}`}>{money(value)}</span>
            </p>
          ))}
          <p className="mt-1.5 flex justify-between gap-2 border-t border-white/10 pt-1.5 text-zinc-400">
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="size-2.5 rounded-full bg-white" />
              Em valor de hoje
            </span>
            <span className="tabular-nums text-white">{money(tip.real)}</span>
          </p>
        </div>
      )}

      <div className="sr-only">
      <table>
        <caption>Patrimônio projetado por ano</caption>
        <thead>
          <tr><th>Ano</th><th>Patrimônio</th><th>Aportes</th><th>Em valor de hoje</th></tr>
        </thead>
        <tbody>
          {Array.from({ length: years + 1 }, (_, yr) => (
            <tr key={yr}><td>{yr}</td><td>{money(series.total[yr * 12])}</td><td>{money(series.invested[yr * 12])}</td><td>{money(real[yr * 12])}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

/* ---------- Peças do resultado ---------- */

function Stat({ label, color, opacity = 1, value, note, whole }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-sm text-zinc-400">
        {color && <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: color, opacity }} />}
        {label}
      </p>
      <p className="mt-1 truncate text-[clamp(1.25rem,1.9vw,2.25rem)] font-semibold leading-tight tracking-tight tabular-nums">{whole ? reais(value) : money(value)}</p>
      {note && <p className="mt-0.5 text-xs text-zinc-500">{note}</p>}
    </div>
  )
}

// Legenda do gráfico: cada marca é igual ao que aparece desenhado
function Legend() {
  const item = 'flex items-center gap-2 whitespace-nowrap'
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400">
      <li className={item}>
        <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: BLUE }} />
        Aportes
      </li>
      <li className={item}>
        <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: GREEN }} />
        Patrimônio total
      </li>
      <li className={item}>
        <span className="w-4 border-t-2 border-dotted border-white" />
        Em valor de hoje (descontada a inflação)
      </li>
    </ul>
  )
}

function InfoCell({ icon: Icon, title, children }) {
  return (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${CELL_H}`}>
      <p className="flex items-center gap-2 text-xs text-zinc-400">
        <Icon className="size-3.5" strokeWidth={1.75} />
        {title}
      </p>
      <div className="mt-2 min-h-0 flex-1">{children}</div>
    </div>
  )
}

/* ---------- Tela ---------- */

export default function Projecao({ backHref = '/' }) {
  const { movements, exceptions } = useFinanceData()

  // Números do simulador. O patrimônio de partida é o saldo da conta (vem dos lançamentos).
  const [monthly, setMonthly] = useState(0) // começa vazio: o usuário digita o aporte
  const [rateStr, setRateStr] = useState('10')
  const [yearsStr, setYearsStr] = useState('10')
  const [inflationStr, setInflationStr] = useState('4,5')
  const [meta, setMeta] = useState(0)

  // Saldo da conta (soma dos lançamentos que já aconteceram)
  const today = todayISO()
  const balance = useMemo(() => currentBalance(expandOccurrences(movements, today, exceptions)), [movements, exceptions, today])
  const initial = Math.max(0, balance) // saldo negativo: a projeção parte de zero

  const annualPct = clamp(parseFloat(rateStr.replace(',', '.')) || 0, 0, 60)
  const inflationPct = clamp(parseFloat(inflationStr.replace(',', '.')) || 0, 0, 60)
  const years = clamp(parseInt(yearsStr, 10) || 1, 1, MAX_YEARS)
  const params = { initial, monthly, annualPct, years }

  const series = useMemo(() => simulate(params), [initial, monthly, annualPct, years])
  const real = useMemo(() => deflate(series.total, inflationPct), [series, inflationPct])
  const milestones = useMemo(() => findMilestones(series.total, initial), [series, initial])

  const n = years * 12
  const finalTotal = series.total[n]
  const invested = series.invested[n]
  const interest = finalTotal - invested
  const realFinal = real[n]
  const bigNumbers = finalTotal >= 100_000_000 // a partir de R$ 1 mi, os valores aparecem sem centavos
  const eroded = finalTotal - realFinal // quanto a inflação "come" do valor final
  const realReturn = realReturnPct(annualPct, inflationPct)

  // Meta
  const metaMonths = meta > 0 ? monthsToReach(meta, params) : undefined
  const needed = meta > 0 ? Math.ceil(requiredMonthly(meta, params) / 100) * 100 : 0

  const summary = `${reais(initial)} + ${reais(monthly)} por mês · ${annualPct.toLocaleString('pt-BR')}% ao ano · ${years} ${years === 1 ? 'ano' : 'anos'}`

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
            Projeção <span className="text-zinc-500">financeira</span>
          </h1>
        </div>
      </header>

      <div className="mt-[3dvh] grid flex-1 grid-cols-1 gap-5 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-1">
        {/* Simulador */}
        <form
          onSubmit={(e) => e.preventDefault()}
          // Altura dos campos: 44px em telas baixas, crescendo até 56px em telas mais altas
          style={{ '--ctl': 'clamp(2.75rem, calc(2.75rem + (100dvh - 768px) * 0.1), 3.5rem)' }}
          className="flex flex-col rounded-3xl border border-white/10 bg-[#0C0C0E] p-6 lg:col-span-5 lg:min-h-0"
        >
          <div>
            <h2 className="text-lg font-medium leading-tight">Simulação</h2>
            <p className="mt-1 text-sm text-zinc-400">Digite os números e veja o patrimônio crescer.</p>
          </div>

          <div className="mt-6 grid flex-1 grid-cols-2 content-between gap-x-4 gap-y-4">
            <div>
              <Field label="Saldo da conta (patrimônio)">
                <div
                  aria-label={`Saldo da conta: ${money(balance)}`}
                  className="flex h-[var(--ctl)] w-full items-center rounded-2xl border border-dashed border-white/15 px-4 text-base font-semibold tabular-nums"
                >
                  {money(balance)}
                </div>
              </Field>
              <p className="mt-1.5 h-4 truncate text-xs text-zinc-500">
                {balance < 0 ? 'Saldo negativo: a projeção parte de R$ 0.' : 'Vem dos seus lançamentos.'}
              </p>
            </div>
            <div>
              <Field label="Aporte mensal" htmlFor="proj-aporte">
                <MoneyInput id="proj-aporte" value={monthly} onChange={setMonthly} />
              </Field>
            </div>
            <Field label="Rentabilidade" htmlFor="proj-taxa">
              <RateInput id="proj-taxa" value={rateStr} onChange={setRateStr} />
            </Field>
            <Field label="Prazo" htmlFor="proj-prazo">
              <YearsInput id="proj-prazo" value={yearsStr} onChange={setYearsStr} />
            </Field>
            <Field label="Inflação estimada" htmlFor="proj-inflacao">
              <RateInput id="proj-inflacao" value={inflationStr} onChange={setInflationStr} />
            </Field>
            <Field label="Rentabilidade real">
              <div
                aria-label={`Rentabilidade real: ${realReturn.toFixed(1)}% ao ano`}
                className="flex h-[var(--ctl)] w-full items-center justify-between rounded-2xl border border-dashed border-white/15 px-4 text-base font-semibold tabular-nums"
              >
                {realReturn.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                <span className="text-sm font-normal text-zinc-500">% ao ano</span>
              </div>
            </Field>
            <div className="col-span-2">
              <Field label="Meta de patrimônio (opcional)" htmlFor="proj-meta">
                <MoneyInput id="proj-meta" value={meta} onChange={setMeta} />
              </Field>
            </div>
          </div>

          <p className="pt-5 text-xs leading-relaxed text-zinc-500">
            Estimativa com juros compostos mensais e inflação constante. Não é garantia de rentabilidade nem recomendação de investimento.
          </p>
        </form>

        {/* Resultado */}
        <section className="flex min-h-[40rem] flex-col rounded-3xl border border-white/10 bg-[#0C0C0E] p-6 lg:col-span-7 lg:min-h-0">
          <div>
            <h2 className="text-lg font-medium leading-tight">Evolução do patrimônio</h2>
            <p className="mt-1 text-sm text-zinc-400">{summary}</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <Stat label="Patrimônio final" whole={bigNumbers} value={finalTotal} note={`${reais(realFinal)} em valor de hoje`} />
            <Stat label="Total investido" color={AREA_BLUE} whole={bigNumbers} value={invested} />
            <Stat
              label="Rendimento dos juros"
              color={AREA_GREEN}
              whole={bigNumbers}
              value={interest}
              note={finalTotal > 0 ? `${Math.round((interest / finalTotal) * 100)}% do patrimônio` : undefined}
            />
          </div>

          <Legend />

          <div className="mt-3 h-[22rem] min-h-0 lg:h-auto lg:flex-1">
            <GrowthChart series={series} real={real} meta={meta} milestones={milestones} years={years} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoCell icon={Target} title="Meta">
              {meta <= 0 ? (
                <p className="text-sm text-zinc-500">Defina uma meta ao lado para ver em quanto tempo você chega lá.</p>
              ) : metaMonths === 0 ? (
                <p className="text-sm text-zinc-300">Você já tem {reais(meta)}.</p>
              ) : metaMonths == null ? (
                <>
                  <p className="text-sm font-medium">Fora do alcance</p>
                  <p className="mt-1 text-xs text-zinc-500">Nem em 100 anos com esses números. Aumente o aporte ou o prazo.</p>
                </>
              ) : (
                <>
                  <p className="truncate text-base font-semibold">{spanText(metaMonths)}</p>
                  <p className="mt-1 text-xs leading-snug text-zinc-500">
                    {metaMonths <= n
                      ? `para chegar a ${reais(meta)}, dentro do prazo.`
                      : `para ${reais(meta)}. No prazo de ${years} ${years === 1 ? 'ano' : 'anos'}: aporte ${reais(needed)}/mês.`}
                  </p>
                </>
              )}
            </InfoCell>

            <InfoCell icon={Flag} title="Marcos">
              {milestones.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum marco de R$ 100 mil ou mais dentro do prazo.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {milestones.map((ms) => (
                    <li key={ms.value} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-white" />
                        {compactMoney(ms.value)}
                      </span>
                      <span className="tabular-nums text-zinc-400">{spanShort(ms.month)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </InfoCell>

            <InfoCell icon={TrendingDown} title="Inflação">
              <p className="truncate text-base font-semibold tabular-nums">{bigNumbers ? reais(eroded) : money(eroded)}</p>
              <p className="mt-1 text-xs leading-snug text-zinc-500">
                perdidos para a inflação de {inflationPct.toLocaleString('pt-BR')}% ao ano
                {realReturn < 0 ? ': a rentabilidade fica abaixo da inflação.' : '.'}
              </p>
            </InfoCell>
          </div>
        </section>
      </div>
    </main>
  )
}
