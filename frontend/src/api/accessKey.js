// Senha de acesso PROVISÓRIA (ADR 0026): guardada no navegador e enviada em todo pedido à API.
// Sai quando o login real entrar. O localStorage pode estar bloqueado (aba anônima): por isso o try/catch
// e a cópia em memória, que garante que o app funcione mesmo sem armazenamento.
const CHAVE = 'financeiro:access-key'
let memoria = ''
const ouvintes = new Set()

export function getAccessKey() {
  try {
    return globalThis.localStorage?.getItem(CHAVE) ?? memoria
  } catch {
    return memoria
  }
}

export function setAccessKey(valor) {
  memoria = valor
  try {
    globalThis.localStorage?.setItem(CHAVE, valor)
  } catch {
    /* sem armazenamento: fica só na memória */
  }
}

export function clearAccessKey() {
  memoria = ''
  try {
    globalThis.localStorage?.removeItem(CHAVE)
  } catch {
    /* idem */
  }
}

// A API respondeu "senha inválida" no meio do uso (ex.: a senha foi trocada): a tela de senha precisa reaparecer.
export function onAccessDenied(fn) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}
export const notifyAccessDenied = () => ouvintes.forEach((fn) => fn())
