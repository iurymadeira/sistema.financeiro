'use client'

import Link from 'next/link'

// Se uma tela quebrar, mostra o erro na própria página (em vez de tela preta).
export default function Error({ error, reset }) {
  return (
    <div className="p-8 font-mono text-sm text-red-400">
      <p className="mb-3 text-base font-semibold text-white">Algo deu errado nesta tela</p>
      <pre className="m-0 whitespace-pre-wrap">{String(error?.stack || error)}</pre>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-white">
          Tentar de novo
        </button>
        <Link href="/" className="rounded-full border border-white/20 px-4 py-2 text-white">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
