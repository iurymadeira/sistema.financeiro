// Guarda a REGRA DE DEPENDÊNCIA do front (ADR 0027): cada pasta só pode importar das pastas "de baixo".
// Se alguém (ou uma IA) fizer a pasta domain/ importar React ou uma tela, estes testes falham.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, dirname, relative, sep } from 'node:path'

const SRC = resolve(import.meta.dirname, '../src')

function arquivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? arquivos(p) : /\.(js|jsx)$/.test(n) ? [p] : []
  })
}

// Lista o que cada arquivo importa: pacotes (ex.: 'react') e pastas internas (ex.: 'hooks')
function importsDe(arquivo) {
  const texto = readFileSync(arquivo, 'utf8')
  const alvos = [...texto.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2])
  return alvos.map((alvo) => {
    if (!alvo.startsWith('.')) return { pacote: alvo }
    const pasta = relative(SRC, resolve(dirname(arquivo), alvo)).split(sep)[0]
    return { pasta }
  })
}

// pasta -> o que ela NÃO pode importar
const PROIBIDO = {
  domain: { pastas: ['api', 'hooks', 'screens', 'components', 'app'], pacotes: ['react', 'react-dom', 'next', 'lucide-react'] },
  api: { pastas: ['hooks', 'screens', 'components', 'app'], pacotes: ['react', 'next', 'lucide-react'] },
  hooks: { pastas: ['screens', 'components', 'app'], pacotes: ['next', 'lucide-react'] },
}

for (const [pasta, regra] of Object.entries(PROIBIDO)) {
  test(`${pasta}/ não importa ${[...regra.pastas, ...regra.pacotes].join(', ')}`, () => {
    const arqs = arquivos(join(SRC, pasta))
    assert.ok(arqs.length > 0, `pasta ${pasta}/ vazia ou inexistente`)
    for (const arq of arqs) {
      for (const imp of importsDe(arq)) {
        assert.ok(!(imp.pasta && regra.pastas.includes(imp.pasta)), `${relative(SRC, arq)} importa a pasta ${imp.pasta}/`)
        assert.ok(!(imp.pacote && regra.pacotes.includes(imp.pacote)), `${relative(SRC, arq)} importa o pacote ${imp.pacote}`)
      }
    }
  })
}

// Uma tela não pode depender de outra tela (foi o que acontecia: 4 telas importavam peças de dentro de
// Movimentacoes.jsx). Peça usada por mais de uma tela vai para components/. Combinados:
// - a janela "meses da recorrência" é filha da tela de Movimentações;
// - uma tela pode ter uma subpasta própria (screens/movimentacoes/), que só ela e os arquivos da própria subpasta usam.
const PERMITIDO_ENTRE_TELAS = new Set(['Movimentacoes.jsx->MesesDaRecorrencia.jsx'])

test('screens/ não importa outras telas (só as exceções combinadas)', () => {
  const telas = join(SRC, 'screens')
  for (const arq of arquivos(telas)) {
    const texto = readFileSync(arq, 'utf8')
    for (const m of texto.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const alvo = resolve(dirname(arq), m[1])
      if (relative(SRC, alvo).split(sep)[0] !== 'screens') continue
      const de = relative(telas, arq)
      const para = relative(telas, alvo)
      const subpastaDe = de.includes(sep) ? de.split(sep)[0] : null
      const subpastaPara = para.includes(sep) ? para.split(sep)[0] : null
      const mesmaSubpasta = subpastaDe && subpastaDe === subpastaPara
      const telaDona = !subpastaDe && subpastaPara && de.toLowerCase() === `${subpastaPara}.jsx`
      assert.ok(mesmaSubpasta || telaDona || PERMITIDO_ENTRE_TELAS.has(`${de}->${para}`), `${de}->${para}: uma tela importa outra tela. Mova a peça comum para components/.`)
    }
  }
})
