// Cliente HTTP mínimo para falar com a API (usado pelo apiRepository).
//
// - Envia e recebe JSON.
// - `credentials: 'include'` faz o navegador mandar o cookie de sessão (ADR 0007).
// - Qualquer falha vira um `ApiError` com uma mensagem pronta para mostrar ao usuário.
//   As telas já mostram `err.message`, então nada muda nelas.

export class ApiError extends Error {
  constructor(message, status = 0, code = 'unknown') {
    super(message)
    this.name = 'ApiError'
    this.status = status // 0 = nem chegou ao servidor
    this.code = code
  }
}

export function createHttp(baseUrl, fetchImpl = globalThis.fetch) {
  const base = baseUrl.replace(/\/+$/, '')

  async function request(method, path, body) {
    let res
    try {
      res = await fetchImpl(`${base}${path}`, {
        method,
        credentials: 'include',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError('Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.', 0, 'network')
    }

    if (res.status === 204) return null
    let data = null
    try {
      data = await res.json()
    } catch {
      /* resposta sem corpo JSON */
    }
    if (!res.ok) {
      throw new ApiError(data?.error?.message ?? 'Algo deu errado. Tente de novo.', res.status, data?.error?.code ?? 'unknown')
    }
    return data
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    patch: (path, body) => request('PATCH', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
  }
}
