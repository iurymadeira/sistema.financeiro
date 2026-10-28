import './globals.css'
import AppShell from '../components/AppShell.jsx'

export const metadata = {
  title: 'Financeiro',
  description: 'Seu sistema financeiro pessoal',
}

// Layout raiz (componente de servidor): é o "casco" HTML de todas as páginas.
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
