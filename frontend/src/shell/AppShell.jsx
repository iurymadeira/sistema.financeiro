'use client'

// "Casco" do app: guarda o que é compartilhado entre as telas (perfil e janelas flutuantes).
// Fica no layout, então NÃO é recriado ao trocar de página.
import { createContext, useContext, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useProfile } from '../hooks/useProfile.js'

// As janelas só são baixadas quando alguém as abre (divisão de código).
const Configuracoes = dynamic(() => import('../screens/Configuracoes.jsx'), { ssr: false })
const MovimentacaoRapida = dynamic(() => import('../screens/MovimentacaoRapida.jsx'), { ssr: false })

const ShellContext = createContext(null)

export const useShell = () => useContext(ShellContext)

export default function AppShell({ children }) {
  const { profile, update, changePassword } = useProfile()
  const [quick, setQuick] = useState(false)
  const [settings, setSettings] = useState(false)

  const value = useMemo(
    () => ({ profile, openQuick: () => setQuick(true), openSettings: () => setSettings(true) }),
    [profile],
  )

  return (
    <ShellContext.Provider value={value}>
      {children}
      {quick && <MovimentacaoRapida onClose={() => setQuick(false)} />}
      {settings && (
        <Configuracoes profile={profile} onSave={update} onChangePassword={changePassword} onClose={() => setSettings(false)} />
      )}
    </ShellContext.Provider>
  )
}
