// Camada de dados do sistema. As telas usam as funções assíncronas deste repositório.

import { DEFAULT_CATEGORIES } from './categories.js'
import { monthKey, todayISO } from './dates.js'
import { endDateFromMonths, endOfRecurrence, findException, isValidExceptionFor } from './recurrence.js'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000/api'}/state`

let state = null
let statePromise = null

const clone = (value) => JSON.parse(JSON.stringify(value))

function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

async function request(options = {}) {
  const response = await fetch(API_URL, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.erro || 'Não foi possível acessar o servidor.')
  return body
}

// Dados salvos por versões anteriores usavam `months` (duração em meses). Converte para `endDate`.
// É uma "migração de dados" simples: roda a cada carga e não faz nada se já estiver convertido.
function normalize(saved) {
  saved.exceptions ??= [] // dados salvos antes das exceções (ADR 0013) não tinham esta lista
  for (const m of saved.movements ?? []) {
    if ('months' in m) {
      if (!('endDate' in m)) m.endDate = m.recurring ? endDateFromMonths(m.date, m.months) : null
      delete m.months
    }
  }
  return saved
}

async function load() {
  if (state) return state
  if (!statePromise) {
    statePromise = request().then(({ state: saved }) => {
      state = saved
        ? normalize(saved)
        : { movements: [], customCategories: [], exceptions: [] }
      return state
    })
  }
  try {
    return await statePromise
  } finally {
    statePromise = null
  }
}

async function persist() {
  try {
    await request({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    })
  } catch (error) {
    state = null
    throw error
  }
}

// Descarta exceções que deixaram de fazer sentido (regra mudou de início/fim, virou pontual ou sumiu).
function pruneExceptions(s) {
  s.exceptions = s.exceptions.filter((e) => {
    const m = s.movements.find((x) => x.id === e.movementId)
    return m && isValidExceptionFor(m, e)
  })
}

const DEFAULT_PROFILE = { name: 'Marina', email: 'marina@exemplo.com', photo: null }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const EDITABLE_FIELDS = ['amount', 'date', 'description', 'method', 'recurring', 'endDate']

export const repository = {
  // ---- Perfil do usuário (nome, e-mail, foto) ----
  async getProfile() {
    const s = await load()
    return clone({ ...DEFAULT_PROFILE, ...(s.profile ?? {}) })
  },

  async updateProfile(patch) {
    const s = await load()
    const next = { ...DEFAULT_PROFILE, ...(s.profile ?? {}), ...patch }
    next.name = String(next.name ?? '').trim()
    next.email = String(next.email ?? '').trim()
    if (!next.name) throw new Error('Informe seu nome.')
    if (!EMAIL_RE.test(next.email)) throw new Error('Informe um e-mail válido.')
    s.profile = next
    await persist()
    return clone(next)
  },

  // A troca de senha segue simulada até existir autenticação no backend.
  async changePassword({ current, next, confirm }) {
    if (!current) throw new Error('Informe sua senha atual.')
    if (!next || next.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.')
    if (next === current) throw new Error('A nova senha deve ser diferente da atual.')
    if (next !== confirm) throw new Error('A confirmação não é igual à nova senha.')
  },

  async listMovements() {
    return clone((await load()).movements)
  },

  async createMovement(input) {
    const s = await load()
    if (!(input.amount > 0)) throw new Error('Informe um valor maior que zero.')
    const category = [...DEFAULT_CATEGORIES, ...s.customCategories].find((c) => c.id === input.categoryId)
    if (!category) throw new Error('Escolha uma categoria.')
    const movement = {
      id: uid(),
      type: category.type,
      categoryId: category.id,
      amount: Math.round(input.amount),
      date: input.date,
      description: input.description ?? '',
      method: input.method,
      recurring: Boolean(input.recurring),
      endDate: input.recurring ? input.endDate ?? null : null,
      createdAt: Date.now(),
    }
    s.movements.push(movement)
    await persist()
    return clone(movement)
  },

  // Só valor, data, descrição, método e recorrência podem ser alterados.
  async updateMovement(id, patch) {
    const s = await load()
    const movement = s.movements.find((m) => m.id === id)
    if (!movement) throw new Error('Movimentação não encontrada.')
    for (const key of EDITABLE_FIELDS) {
      if (key in patch) movement[key] = patch[key]
    }
    if (!movement.recurring) movement.endDate = null
    pruneExceptions(s)
    await persist()
    return clone(movement)
  },

  // Pontual: apaga. Recorrência: encerra (os meses anteriores ficam no histórico), e só apaga
  // de vez se não houver mês anterior. Devolve o que aconteceu: { removed } ou { ended, endDate }.
  async deleteMovement(id) {
    const s = await load()
    const movement = s.movements.find((m) => m.id === id)
    if (!movement) return { removed: false }
    if (movement.recurring) {
      const result = endOfRecurrence(movement, todayISO())
      if (!result.remove) {
        movement.endDate = result.endDate
        pruneExceptions(s)
        await persist()
        return { ended: true, endDate: result.endDate }
      }
    }
    s.movements = s.movements.filter((m) => m.id !== id)
    pruneExceptions(s)
    await persist()
    return { removed: true }
  },

  // ---- Exceções: alterar ou cancelar UM mês de uma recorrência (ADR 0013) ----
  async listExceptions() {
    return clone((await load()).exceptions)
  },

  // Cria ou substitui a exceção de um mês. `change` pode ter { amount, date } (o que muda) ou
  // { cancelled: true }. Se o resultado ficar igual ao que a regra manda, a exceção é removida.
  async saveException(movementId, originalDate, change) {
    const s = await load()
    const m = s.movements.find((x) => x.id === movementId)
    if (!m?.recurring) throw new Error('Recorrência não encontrada.')
    const probe = { movementId, originalDate }
    if (!isValidExceptionFor(m, probe)) throw new Error('Esse mês não faz parte da recorrência.')

    const next = {
      id: uid(),
      movementId,
      originalDate,
      newAmount: null,
      newDate: null,
      cancelled: Boolean(change.cancelled),
    }
    if (!next.cancelled) {
      if (change.amount != null && change.amount !== m.amount) {
        if (!(change.amount > 0)) throw new Error('Informe um valor maior que zero.')
        next.newAmount = Math.round(change.amount)
      }
      if (change.date != null && change.date !== originalDate) {
        if (monthKey(change.date) !== monthKey(originalDate)) throw new Error('A nova data precisa ficar no mesmo mês.')
        next.newDate = change.date
      }
    }
    const old = findException(s.exceptions, movementId, originalDate)
    if (old) s.exceptions = s.exceptions.filter((e) => e !== old)
    if (next.cancelled || next.newAmount != null || next.newDate != null) s.exceptions.push(next)
    await persist()
    return clone(next)
  },

  // Volta o mês ao que a regra manda
  async removeException(movementId, originalDate) {
    const s = await load()
    const old = findException(s.exceptions, movementId, originalDate)
    if (old) {
      s.exceptions = s.exceptions.filter((e) => e !== old)
      await persist()
    }
  },

  async listCategories() {
    return clone([...DEFAULT_CATEGORIES, ...(await load()).customCategories])
  },

  async createCategory({ name, type, icon }) {
    const s = await load()
    const clean = name.trim()
    if (!clean) throw new Error('Dê um nome à categoria.')
    const all = [...DEFAULT_CATEGORIES, ...s.customCategories]
    if (all.some((c) => c.type === type && c.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error('Já existe uma categoria com esse nome.')
    }
    const category = { id: `custom-${uid()}`, name: clean, type, icon, custom: true }
    s.customCategories.push(category)
    await persist()
    return clone(category)
  },
}
