import '@fontsource-variable/figtree' // fonte Figtree empacotada no próprio site (sem pedir nada ao Google em tempo de uso)
import './globals.css'
import AccessGate from '../shell/AccessGate.jsx'
import AppShell from '../shell/AppShell.jsx'

export const metadata = {
  title: 'Financeiro',
  description: 'Seu sistema financeiro pessoal',
}

// Layout raiz (componente de servidor): é o "casco" HTML de todas as páginas.
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AccessGate>
          <AppShell>{children}</AppShell>
        </AccessGate>
      </body>
    </html>
  )
}
