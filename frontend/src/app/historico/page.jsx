'use client'

import dynamic from 'next/dynamic'

// Tela interativa que depende de data/hora e de APIs do navegador: renderiza só no cliente
// para não haver diferença entre o HTML do servidor e o do navegador (erro de "hydration").
const Tela = dynamic(() => import('../../screens/Historico.jsx'), { ssr: false })

export default function Page() {
  return <Tela />
}
