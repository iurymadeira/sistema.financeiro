'use client'

// "Portaria" provisória (ADR 0026): só mostra o app depois que a API aceitar a senha de acesso.
// Se a API não exige senha (desenvolvimento), a checagem passa direto e o usuário nem vê esta tela.
import { useEffect, useState } from 'react'
import { repository } from '../api/index.js'
import { clearAccessKey, onAccessDenied, setAccessKey } from '../api/accessKey.js'

const TENTATIVAS_ACORDAR = 15 // ~1 minuto: o servidor grátis dorme e leva cerca de 1 min para acordar
const ESPERA_MS = 4000

async function verificar(ativo, setEstado, setErro) {
  for (let i = 0; i < TENTATIVAS_ACORDAR; i++) {
    try {
      await repository.checkAccess()
      if (ativo()) setEstado('open')
      return true
    } catch (e) {
      if (!ativo()) return false
      if (e.code === 'access_denied') {
        clearAccessKey()
        setEstado('locked')
        return false
      }
      if (e.code === 'too_many_attempts') {
        setErro(e.message)
        setEstado('locked')
        return false
      }
      if (e.code !== 'network' && e.status < 500) {
        setErro(e.message)
        setEstado('locked')
        return false
      }
      setEstado('waking') // sem resposta ou erro de servidor: provavelmente acordando
      await new Promise((r) => setTimeout(r, ESPERA_MS))
    }
  }
  if (ativo()) {
    setErro('O servidor não respondeu. Tente de novo em instantes.')
    setEstado('locked')
  }
  return false
}

export default function AccessGate({ children }) {
  const [estado, setEstado] = useState('checking') // checking | waking | locked | open
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vivo = true
    verificar(() => vivo, setEstado, setErro)
    const sair = onAccessDenied(() => {
      clearAccessKey()
      setEstado('locked')
    })
    return () => {
      vivo = false
      sair()
    }
  }, [])

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    setAccessKey(senha)
    try {
      await repository.checkAccess()
      setEstado('open')
    } catch (err) {
      clearAccessKey()
      setErro(err.code === 'network' ? 'Não consegui falar com o servidor. Tente de novo.' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (estado === 'open') return children

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-200">
      {estado === 'checking' || estado === 'waking' ? (
        <p role="status" className="text-center text-sm text-zinc-400">
          {estado === 'waking' ? 'Acordando o servidor… isso pode levar cerca de um minuto na primeira visita.' : 'Carregando…'}
        </p>
      ) : (
        <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="text-sm text-zinc-400">Este é um projeto de estudo. Informe a senha de acesso para continuar.</p>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Senha de acesso</span>
            <input
              type="password"
              autoFocus
              autoComplete="off"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-500"
            />
          </label>
          {erro && (
            <p role="alert" className="text-sm text-red-400">
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando || !senha}
            className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      )}
    </main>
  )
}
