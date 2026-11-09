// Testa o apiRepository com um fetch falso (sem servidor): confere URL, método, corpo e erros.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiRepository } from '../src/api/apiRepository.js'
import { ApiError } from '../src/api/http.js'

function fake(responses = []) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, credentials: init.credentials, body: init.body ? JSON.parse(init.body) : undefined })
    const r = responses.shift() ?? { status: 200, body: {} }
    if (r.throws) throw new Error('offline')
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => { if (r.body === undefined) throw new Error('sem corpo'); return r.body } }
  }
  return { calls, repo: createApiRepository('http://api.test/api/', fetchImpl) }
}

test('lista movimentações: GET, com cookie de sessão', async () => {
  const { repo, calls } = fake([{ status: 200, body: [{ id: '1' }] }])
  assert.deepEqual(await repo.listMovements(), [{ id: '1' }])
  assert.equal(calls[0].url, 'http://api.test/api/movements') // barra final da base é ignorada
  assert.equal(calls[0].method, 'GET')
  assert.equal(calls[0].credentials, 'include')
})

test('cria movimentação: manda só os campos do contrato, valor inteiro, sem endDate se pontual', async () => {
  const { repo, calls } = fake([{ status: 201, body: { id: '9' } }])
  await repo.createMovement({ categoryId: 'salario', amount: 1234.6, date: '2026-10-05', method: 'PIX', recurring: false, endDate: '2030-01-01', lixo: 1 })
  assert.deepEqual(calls[0].body, { categoryId: 'salario', amount: 1235, date: '2026-10-05', description: '', method: 'PIX', recurring: false, endDate: null })
})

test('atualiza: só campos editáveis; id é codificado na URL', async () => {
  const { repo, calls } = fake()
  await repo.updateMovement('a/b', { amount: 500, categoryId: 'x', type: 'receita', method: 'Boleto' })
  assert.equal(calls[0].url, 'http://api.test/api/movements/a%2Fb')
  assert.equal(calls[0].method, 'PATCH')
  assert.deepEqual(calls[0].body, { amount: 500, method: 'Boleto' })
})

test('excluir devolve o que o servidor respondeu (removido ou encerrado)', async () => {
  const { repo } = fake([{ status: 200, body: { ended: true, endDate: '2026-09-30' } }])
  assert.deepEqual(await repo.deleteMovement('1'), { ended: true, endDate: '2026-09-30' })
})

test('exceções: PUT com a data original na URL; 204 vira null', async () => {
  const { repo, calls } = fake([{ status: 204 }, { status: 204 }])
  assert.equal(await repo.saveException('7', '2026-03-05', { amount: 9000.2, date: '2026-03-09' }), null)
  assert.equal(calls[0].url, 'http://api.test/api/movements/7/exceptions/2026-03-05')
  assert.equal(calls[0].method, 'PUT')
  assert.deepEqual(calls[0].body, { amount: 9000, date: '2026-03-09', cancelled: false })
  await repo.removeException('7', '2026-03-05')
  assert.equal(calls[1].method, 'DELETE')
})

test('cancelar um mês manda cancelled: true', async () => {
  const { repo, calls } = fake([{ status: 200, body: { id: 'e1' } }])
  await repo.saveException('7', '2026-03-05', { cancelled: true })
  assert.deepEqual(calls[0].body, { amount: null, date: null, cancelled: true })
})

test('perfil: lê e altera por /me (provisório até existir login)', async () => {
  const { repo, calls } = fake([{ status: 200, body: { id: '1', name: 'Marina' } }, { status: 200, body: { id: '1', name: 'Ana' } }])
  assert.equal((await repo.getProfile()).name, 'Marina')
  assert.equal(calls[0].url, 'http://api.test/api/me')
  await repo.updateProfile({ name: 'Ana' })
  assert.equal(calls[1].method, 'PATCH')
  assert.deepEqual(calls[1].body, { name: 'Ana' })
})

test('categorias: lista e cria só com os campos do contrato', async () => {
  const { repo, calls } = fake([{ status: 200, body: [] }, { status: 201, body: { id: '10' } }])
  await repo.listCategories()
  await repo.createCategory({ name: 'Academia', type: 'despesa', icon: 'Dumbbell', lixo: 1 })
  assert.equal(calls[0].url, 'http://api.test/api/categories')
  assert.deepEqual(calls[1].body, { name: 'Academia', type: 'despesa', icon: 'Dumbbell' })
})

test('erro do servidor vira ApiError com a mensagem dele (e status/código)', async () => {
  const { repo } = fake([{ status: 422, body: { error: { code: 'invalid_amount', message: 'Informe um valor maior que zero.' } } }])
  await assert.rejects(repo.createMovement({ categoryId: 'x', amount: 0, date: '2026-01-01', method: 'PIX' }), (e) => {
    assert.ok(e instanceof ApiError)
    assert.equal(e.message, 'Informe um valor maior que zero.')
    assert.equal(e.status, 422)
    assert.equal(e.code, 'invalid_amount')
    return true
  })
})

test('servidor fora do ar: mensagem amigável, status 0', async () => {
  const { repo } = fake([{ throws: true }])
  await assert.rejects(repo.listMovements(), (e) => e.status === 0 && /servidor/.test(e.message))
})

test('resposta de erro sem corpo JSON ainda gera mensagem útil', async () => {
  const { repo } = fake([{ status: 500, body: undefined }])
  await assert.rejects(repo.listCategories(), (e) => e.status === 500 && e.message.length > 5)
})

test('trocar senha segue simulada: valida o formulário e NÃO chama o servidor (até existir login)', async () => {
  const { repo, calls } = fake()
  await assert.rejects(repo.changePassword({ current: 'a', next: 'curta', confirm: 'curta' }), /8 caracteres/)
  await assert.rejects(repo.changePassword({ current: 'senhaantiga1', next: 'senhaantiga1', confirm: 'senhaantiga1' }), /diferente/)
  await assert.rejects(repo.changePassword({ current: 'senhaantiga1', next: 'novasenha123', confirm: 'outra' }), /confirmação/)
  await repo.changePassword({ current: 'senhaantiga1', next: 'novasenha123', confirm: 'novasenha123' })
  assert.equal(calls.length, 0)
})

test('envia a senha de acesso no cabeçalho X-Access-Key e avisa quando a API a recusa', async () => {
  const headersVistos = []
  let negada = 0
  const fetchImpl = async (url, init) => {
    headersVistos.push(init.headers)
    return { status: 401, ok: false, json: async () => ({ error: { code: 'access_denied', message: 'Senha de acesso inválida.' } }) }
  }
  const repo = createApiRepository('http://api.test/api', fetchImpl, { getAccessKey: () => 'segredo', onDenied: () => negada++ })
  await assert.rejects(repo.checkAccess(), (e) => e.status === 401 && e.code === 'access_denied')
  assert.equal(headersVistos[0]['X-Access-Key'], 'segredo')
  assert.equal(negada, 1)
})

test('sem senha guardada, não manda o cabeçalho; checkAccess faz GET /access', async () => {
  const { repo, calls } = fake([{ status: 204 }])
  assert.equal(await repo.checkAccess(), null)
  assert.equal(calls[0].url, 'http://api.test/api/access')
})
