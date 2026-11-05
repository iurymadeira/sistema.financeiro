// Único jeito do front guardar e ler dados: falar com a API (Express + PostgreSQL).
// Os hooks (useFinanceData, useProfile) usam estas funções; as telas não sabem de HTTP.
//
// O formato das requisições e respostas está em docs/api.md. Regras importantes:
// - dinheiro em CENTAVOS inteiros; datas "AAAA-MM-DD"; tipos "receita"/"despesa" (ADR 0009 e 0010);
// - a validação que garante segurança é do servidor; aqui só validamos o que melhora a experiência.

import { createHttp } from './http.js'

const EDITABLE_FIELDS = ['amount', 'date', 'description', 'method', 'recurring', 'endDate']
const enc = encodeURIComponent

export function createApiRepository(baseUrl, fetchImpl) {
  const http = createHttp(baseUrl, fetchImpl)

  return {
    // ---- Perfil do usuário (provisório até existir login; ADR 0020 e 0024) ----
    getProfile: () => http.get('/me'),
    updateProfile: (patch) => http.patch('/me', patch),
    // A troca de senha segue SIMULADA até existir login: só valida o formulário, não chama o servidor.
    async changePassword({ current, next, confirm }) {
      if (!current) throw new Error('Informe sua senha atual.')
      if (!next || next.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.')
      if (next === current) throw new Error('A nova senha deve ser diferente da atual.')
      if (next !== confirm) throw new Error('A confirmação não é igual à nova senha.')
    },

    // ---- Movimentações ----
    listMovements: () => http.get('/movements'),
    createMovement: (input) =>
      http.post('/movements', {
        categoryId: input.categoryId,
        amount: Math.round(input.amount),
        date: input.date,
        description: input.description ?? '',
        method: input.method,
        recurring: Boolean(input.recurring),
        endDate: input.recurring ? input.endDate ?? null : null,
      }),
    updateMovement(id, patch) {
      const body = {}
      for (const key of EDITABLE_FIELDS) if (key in patch) body[key] = patch[key]
      if ('amount' in body) body.amount = Math.round(body.amount)
      return http.patch(`/movements/${enc(id)}`, body)
    },
    // Resposta: { removed: true } (pontual, ou recorrência sem mês anterior) ou { ended: true, endDate }
    deleteMovement: (id) => http.delete(`/movements/${enc(id)}`),

    // ---- Exceções: um mês de uma recorrência (ADR 0013) ----
    listExceptions: () => http.get('/exceptions'),
    // `change`: { amount, date } ou { cancelled: true }. Devolve a exceção, ou null se ficou igual à regra.
    saveException: (movementId, originalDate, change) =>
      http.put(`/movements/${enc(movementId)}/exceptions/${enc(originalDate)}`, {
        amount: change.amount == null ? null : Math.round(change.amount),
        date: change.date ?? null,
        cancelled: Boolean(change.cancelled),
      }),
    removeException: async (movementId, originalDate) => {
      await http.delete(`/movements/${enc(movementId)}/exceptions/${enc(originalDate)}`)
    },

    // ---- Categorias ----
    listCategories: () => http.get('/categories'),
    createCategory: ({ name, type, icon }) => http.post('/categories', { name, type, icon }),
  }
}
