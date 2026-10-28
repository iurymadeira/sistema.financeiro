import assert from 'node:assert/strict'
import { test } from 'node:test'
import { repository } from '../src/data/repository.js'

test('repository loads and persists application state through the backend', async () => {
  let storedState = null
  const requests = []
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options })
    if (options.method === 'PUT') {
      storedState = JSON.parse(options.body).state
      return Response.json({ sucesso: true })
    }
    return Response.json({ state: storedState })
  }

  try {
    assert.deepEqual(await repository.listMovements(), [])

    const movement = await repository.createMovement({
      amount: 1250,
      categoryId: 'alimentacao',
      date: '2026-10-28',
      method: 'PIX',
      description: 'Teste de persistência',
    })

    assert.equal(storedState.movements[0].id, movement.id)
    assert.equal(storedState.movements[0].amount, 1250)
    assert.equal(requests.filter(({ options }) => options.method === 'PUT').length, 1)

    const { repository: reloadedRepository } = await import('../src/data/repository.js?reload')
    const reloaded = await reloadedRepository.listMovements()
    assert.deepEqual(reloaded, [movement])
  } finally {
    globalThis.fetch = originalFetch
  }
})
