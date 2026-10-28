'use client'

import dynamic from 'next/dynamic'
import { useShell } from '../components/AppShell.jsx'

const Dashboard = dynamic(() => import('../screens/Dashboard.jsx'), { ssr: false })

export default function Page() {
  const { profile, openQuick, openSettings } = useShell()
  if (!profile.name) return null
  return <Dashboard name={profile.name} avatarUrl={profile.photo} onQuickAdd={openQuick} onOpenSettings={openSettings} />
}
