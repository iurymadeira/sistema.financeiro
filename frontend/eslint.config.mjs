import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

// Regras do Next.js e do React (hooks, acessibilidade básica, imagens...).
export default defineConfig([
  ...nextVitals,
  // Regras novas do React que apontam melhorias reais no código (efeitos que só ajustam estado,
  // componentes criados dentro de componentes, leitura de refs durante a renderização).
  // Ficam como AVISO por enquanto para o CI não travar; a tarefa é corrigir os avisos e voltar a 'error'.
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  globalIgnores(['.next/**', 'node_modules/**', 'dist/**', 'next-env.d.ts']),
])
