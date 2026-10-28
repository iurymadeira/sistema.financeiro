import { useCallback, useEffect, useMemo, useState } from 'react'
import { repository } from '../data/repository.js'

// Carrega lançamentos e categorias e expõe as ações. Depois de cada ação, recarrega os dados.
export function useFinanceData() {
  const [movements, setMovements] = useState([])
  const [categories, setCategories] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const [m, c, x] = await Promise.all([repository.listMovements(), repository.listCategories(), repository.listExceptions()])
    setMovements(m)
    setCategories(c)
    setExceptions(x)
    setReady(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const actions = useMemo(
    () => ({
      create: async (input) => {
        const result = await repository.createMovement(input)
        await refresh()
        return result
      },
      update: async (id, patch) => {
        const result = await repository.updateMovement(id, patch)
        await refresh()
        return result
      },
      remove: async (id) => {
        await repository.deleteMovement(id)
        await refresh()
      },
      saveException: async (movementId, originalDate, change) => {
        const result = await repository.saveException(movementId, originalDate, change)
        await refresh()
        return result
      },
      removeException: async (movementId, originalDate) => {
        await repository.removeException(movementId, originalDate)
        await refresh()
      },
      createCategory: async (input) => {
        const result = await repository.createCategory(input)
        await refresh()
        return result
      },
    }),
    [refresh],
  )

  return { movements, categories, exceptions, ready, ...actions }
}
