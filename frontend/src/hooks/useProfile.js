import { useCallback, useEffect, useState } from 'react'
import { repository } from '../data/repository.js'

// Perfil do usuário logado (nome, e-mail, foto) e as ações de alterá-lo.
export function useProfile() {
  const [profile, setProfile] = useState({ name: '', email: '', photo: null })

  useEffect(() => {
    let alive = true
    repository.getProfile().then((p) => alive && setProfile(p))
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback(async (patch) => {
    const next = await repository.updateProfile(patch)
    setProfile(next)
    return next
  }, [])

  const changePassword = useCallback((input) => repository.changePassword(input), [])

  return { profile, update, changePassword }
}
