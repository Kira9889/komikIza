const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) || '/api'

const TOKEN_KEY = 'izalib_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getApiBase() {
  return API_BASE
}

export interface ApiOptions {
  query?: Record<string, string>
  headers?: Record<string, string>
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & ApiOptions = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.headers) Object.assign(headers, options.headers)

  let url = API_BASE + path
  if (options.query) {
    const qs = new URLSearchParams(options.query).toString()
    if (qs) url += (url.includes('?') ? '&' : '?') + qs
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body && body.error) message = body.error
    } catch {
      /* ignore */
    }
    const err: any = new Error(message)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// Cek apakah backend aktif (dicache agar hanya dicek sekali per sesi).
let onlineChecked = false
let onlineState = false

export function isBackendOnline(): Promise<boolean> {
  if (onlineChecked) return Promise.resolve(onlineState)
  return new Promise(resolve => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      ctrl.abort()
      onlineChecked = true
      onlineState = false
      resolve(false)
    }, 3000)
    fetch(API_BASE + '/health', { signal: ctrl.signal })
      .then(r => {
        onlineChecked = true
        onlineState = r.ok
        resolve(r.ok)
      })
      .catch(() => {
        onlineChecked = true
        onlineState = false
        resolve(false)
      })
      .finally(() => clearTimeout(timer))
  })
}

export function resetOnlineCache() {
  onlineChecked = false
  onlineState = false
}