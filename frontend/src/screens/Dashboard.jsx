/**
 * Dashboard.jsx — Tela inicial do app de finanças pessoais
 *
 * Dependências:  npm i lucide-react
 * Tailwind (v3.4+): adicione a fonte no tailwind.config.js
 *
 *   theme: { extend: { fontFamily: { sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'] } } }
 *
 * E carregue a Figtree no seu index.html (ou no CSS global):
 *
 *   <link rel="preconnect" href="https://fonts.googleapis.com" />
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 *   <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
 */
import { useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Zap, Repeat, LineChart, History, Wallet } from 'lucide-react'
import { monthSummary } from '../data/history.js'
import { todayISO } from '../data/dates.js'
import { useFinanceData } from '../hooks/useFinanceData.js'
import Link from 'next/link'

const GREEN = '#03fc07'
const RED = '#fc0303'
const BLUE = '#1a63ff'
const BLUE_ICON = '#2f6bff'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const CARDS = [
  {
    id: 'rapida',
    title: 'Movimentação rápida',
    description: 'Registre uma entrada ou saída em segundos',
    icon: Zap,
    href: '/movimentacao-rapida',
    primary: true,
  },
  {
    id: 'recorrencias',
    title: 'Movimentações e recorrências',
    description: 'Contas fixas, assinaturas e lançamentos',
    icon: Repeat,
    href: '/movimentacoes',
  },
  {
    id: 'projecao',
    title: 'Projeção financeira',
    description: 'Veja como seu saldo deve evoluir',
    icon: LineChart,
    href: '/projecao',
  },
  {
    id: 'historico',
    title: 'Histórico financeiro',
    description: 'Todas as transações dos meses anteriores',
    icon: History,
    href: '/historico',
  },
]

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl" style={{ backgroundColor: BLUE }}>
        <Wallet className="size-5 text-white" strokeWidth={1.5} />
      </span>
      <span className="text-lg font-semibold tracking-tight">financeiro</span>
    </div>
  )
}

// O avatar é o botão que abre a janela de Configurações (só existe nesta tela)
function Avatar({ name, src, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir configurações"
      aria-haspopup="dialog"
      className="grid size-[clamp(4.725rem,7.14vw,8.4rem)] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-[clamp(1.75rem,2.6vw,3rem)] font-semibold text-zinc-300 outline-none transition-colors hover:border-white/30 focus-visible:ring-2 focus-visible:ring-white/70"
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : name.charAt(0)}
    </button>
  )
}

function NavCard({ title, description, icon: Icon, href, primary, onClick }) {
  return (
    <Link
      href={href}
      onClick={
        onClick
          ? (e) => {
              e.preventDefault()
              onClick()
            }
          : undefined
      }
      className={[
        'group flex min-h-44 flex-col justify-between rounded-3xl border p-6 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-white/70',
        primary
          ? 'border-transparent text-white'
          : 'border-white/10 bg-[#0C0C0E] hover:border-white/20',
      ].join(' ')}
      style={primary ? { backgroundColor: BLUE } : undefined}
    >
      <div className="flex items-start justify-between">
        <Icon
          className="size-10 lg:size-12"
          strokeWidth={1.25}
          style={{ color: primary ? '#fff' : BLUE_ICON }}
        />
        <span
          className={[
            'grid size-8 place-items-center rounded-full border transition-colors',
            primary
              ? 'border-white/30 group-hover:bg-white/15'
              : 'border-white/10 text-zinc-300 group-hover:bg-white/10',
          ].join(' ')}
        >
          <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-medium leading-tight">{title}</h2>
        <p className={primary ? 'text-sm text-white/80' : 'text-sm text-zinc-400'}>{description}</p>
      </div>
    </Link>
  )
}

function FlowBar({ label, value, max, color, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-zinc-400">
          <Icon className="size-3.5" strokeWidth={1.75} style={{ color }} />
          {label}
        </span>
        <span className="font-semibold tabular-nums">{brl.format(value)}</span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function Dashboard({
  name = 'Marina',
  avatarUrl,
  balance: balanceProp, // opcionais: por padrão vêm dos lançamentos reais (em reais)
  variation: variationProp,
  income: incomeProp,
  expenses: expensesProp,
  onOpenSettings, // abre a janela de Configurações
  onQuickAdd, // opcional: abre a janela de movimentação rápida em vez de navegar
}) {
  const { movements, exceptions } = useFinanceData()
  const live = useMemo(() => {
    const s = monthSummary(movements, todayISO(), exceptions)
    return { balance: s.balance / 100, income: s.income / 100, expenses: s.expenses / 100, variation: s.variation }
  }, [movements, exceptions])
  const balance = balanceProp ?? live.balance
  const income = incomeProp ?? live.income
  const expenses = expensesProp ?? live.expenses
  const variation = variationProp !== undefined ? variationProp : live.variation

  const month = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  // "R$ 12.450,00" -> parte inteira em branco, centavos em cinza
  const [whole, cents] = brl.format(balance).split(/,(?=\d{2}$)/)
  const max = Math.max(income, expenses, 1)

  return (
    <main className="flex min-h-dvh w-full flex-col bg-black px-[3%] py-[4dvh] font-sans text-white antialiased lg:h-dvh lg:overflow-hidden">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-[3dvh]">
        <div className="flex items-start justify-between gap-6">
          <Brand />
          <Avatar name={name} src={avatarUrl} onClick={onOpenSettings} />
        </div>
        <h1 className="text-[clamp(2.25rem,3.4vw,4rem)] font-semibold leading-[1.05] tracking-tight">
          {greeting()},
          <br />
          <span className="lowercase text-zinc-500">{name}.</span>
        </h1>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-12 pt-10 lg:min-h-0 lg:grid-cols-2 lg:gap-x-[10%] lg:pb-[5.8dvh] lg:pt-[4dvh]">
        {/* Saldo + resumo (fora de card) */}
        <section className="min-w-0 self-center">
          <p className="text-sm text-zinc-400">Saldo total</p>
          <p className="mt-3 text-[clamp(3rem,4.3vw,5.5rem)] font-semibold leading-none tracking-tighter tabular-nums">
            {whole}
            <span className="text-zinc-500">,{cents}</span>
          </p>

          {variation != null && (
          <span
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0C0C0E] px-3 py-1 text-xs font-medium"
            style={{ color: GREEN }}
          >
            <TrendingUp className="size-3" strokeWidth={1.75} />
            {variation > 0 ? '+' : ''}
            {variation}% este mês
          </span>
          )}

          <div className="mt-14 flex flex-col gap-9">
            <p className="-mb-5 text-sm text-zinc-400">Resumo de {month}</p>
            <FlowBar label="Receitas" value={income} max={max} color={GREEN} icon={ArrowUpRight} />
            <FlowBar label="Despesas" value={expenses} max={max} color={RED} icon={ArrowDownRight} />
          </div>
        </section>

        {/* Grid de cards */}
        <nav
          aria-label="Atalhos"
          className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-rows-2"
        >
          {CARDS.map((card) => (
            <NavCard key={card.id} {...card} href={card.href} onClick={card.id === 'rapida' ? onQuickAdd : undefined} />
          ))}
        </nav>
      </div>
    </main>
  )
}
