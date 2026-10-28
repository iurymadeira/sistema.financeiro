// Cálculos da Projeção financeira (funções puras). Valores em centavos.
//
// Modelo: juros compostos com capitalização mensal. A taxa informada é anual e vira uma taxa
// mensal equivalente; o aporte entra no fim de cada mês. É uma estimativa, não uma garantia.

export const MAX_YEARS = 50
export const MAX_MONTHS_SEARCH = 1200 // limite de busca da meta: 100 anos

export const monthlyRate = (annualPct) => (1 + annualPct / 100) ** (1 / 12) - 1

// Evolução mês a mês. Devolve vetores de tamanho years*12 + 1 (posição 0 = hoje).
export function simulate({ initial, monthly, annualPct, years }) {
  const n = years * 12
  const r = monthlyRate(annualPct)
  const total = new Array(n + 1)
  const invested = new Array(n + 1)
  total[0] = initial
  invested[0] = initial
  for (let m = 1; m <= n; m++) {
    total[m] = total[m - 1] * (1 + r) + monthly
    invested[m] = invested[m - 1] + monthly
  }
  return { total, invested }
}

// Em quantos meses o patrimônio chega à meta (null se não chegar em 100 anos)
export function monthsToReach(target, { initial, monthly, annualPct }) {
  if (initial >= target) return 0
  const r = monthlyRate(annualPct)
  let balance = initial
  for (let m = 1; m <= MAX_MONTHS_SEARCH; m++) {
    balance = balance * (1 + r) + monthly
    if (balance >= target) return m
  }
  return null
}

// Aporte mensal necessário para chegar à meta no fim do prazo (0 se o inicial já basta)
export function requiredMonthly(target, { initial, annualPct, years }) {
  const n = years * 12
  const r = monthlyRate(annualPct)
  const growth = (1 + r) ** n
  const needed = target - initial * growth
  if (needed <= 0) return 0
  return r === 0 ? needed / n : (needed * r) / (growth - 1)
}

// "3 anos e 5 meses", "1 ano", "8 meses"
export function spanText(months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = []
  if (y) parts.push(`${y} ${y === 1 ? 'ano' : 'anos'}`)
  if (m) parts.push(`${m} ${m === 1 ? 'mês' : 'meses'}`)
  return parts.length ? parts.join(' e ') : 'agora'
}

// "3a 5m"
export function spanShort(months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y ? `${y}a` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m'
}

// Marcos (em centavos) que o gráfico destaca
const MILESTONE_STEPS = [100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000].map((v) => v * 100)

// Até 3 marcos que o patrimônio ultrapassa dentro do prazo (espalhados do menor ao maior)
export function findMilestones(total, initial) {
  const reached = []
  for (const value of MILESTONE_STEPS) {
    if (value <= initial) continue
    const month = total.findIndex((t) => t >= value)
    if (month > 0) reached.push({ value, month })
  }
  if (reached.length <= 3) return reached
  return [reached[0], reached[Math.floor((reached.length - 1) / 2)], reached[reached.length - 1]]
}

/* ---------- Escala e rótulos do gráfico ---------- */

// Maior valor "redondo" (em centavos) que comporta os dados em 4 divisões iguais
export function niceMax(maxCents) {
  const max = Math.max(maxCents / 100, 1)
  const base = 10 ** Math.floor(Math.log10(max / 4))
  for (const f of [1, 2, 2.5, 5, 10]) {
    if (f * base * 4 >= max) return f * base * 4 * 100
  }
  return max * 100
}

// "R$ 500", "R$ 20 mil", "R$ 1,5 mi"
export function compactMoney(cents) {
  const reais = cents / 100
  const fmt = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  if (reais >= 1_000_000) return `R$ ${fmt(reais / 1_000_000)} mi`
  if (reais >= 1000) return `R$ ${fmt(reais / 1000)} mil`
  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

/* ---------- Inflação ---------- */

// Valores futuros trazidos para o poder de compra de hoje
export const deflate = (values, inflationPct) => values.map((v, m) => v / (1 + inflationPct / 100) ** (m / 12))

// Rentabilidade real ao ano (já descontada a inflação), em %
export const realReturnPct = (annualPct, inflationPct) => ((1 + annualPct / 100) / (1 + inflationPct / 100) - 1) * 100
