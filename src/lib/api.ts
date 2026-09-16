const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) || '/api'

const TOKEN_KEY = 'tenshi_token'
const LEGACY_TOKEN_KEY = 'izalib_token'

export function getToken(): string | null {
  const current = localStorage.getItem(TOKEN_KEY)
  if (current) return current
  // Migrasi sekali dari key lama IzaLib
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    return legacy
  }
  return null
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getApiBase() {
  return API_BASE
}

// Pesan ramah untuk "backend tidak merespons" (pengganti "HTTP 502" / "Failed to fetch").
export const SERVER_DOWN_MESSAGE = 'Server tidak merespons. Coba lagi sebentar lagi.'

// True jika error artinya backend mati / tak terjangkau (bukan salah input user).
// Error jenis ini boleh jatuh ke mode offline (mock), bukan ditampilkan sebagai 502.
export function isServerDownError(e: any): boolean {
  if (!e) return false
  if (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504) return true
  const msg = String(e.message || '')
  return (
    msg === 'Failed to fetch' ||
    msg === 'Load failed' ||
    msg === 'Network request failed' ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET')
  )
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

  let res: Response
  try {
    res = await fetch(url, { ...options, headers })
  } catch {
    // Backend mati total (mis. dev server belum nyala / ECONNREFUSED).
    // Jangan lempar "Failed to fetch" mentah — anggap offline saja.
    resetOnlineCache()
    const err: any = new Error(SERVER_DOWN_MESSAGE)
    err.status = 0
    err.data = null
    throw err
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    let data: any = null
    try {
      data = await res.json()
      if (data && data.error) message = data.error
    } catch {
      /* ignore */
    }
    // 502/503/504 = backend/proxy mati, BUKAN salah user.
    // Jangan tampilkan "HTTP 502" — pakai pesan ramah + reset cache online
    // agar pengecekan berikutnya sadar backend sedang mati.
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      resetOnlineCache()
      message = SERVER_DOWN_MESSAGE
    }
    const err: any = new Error(message)
    err.status = res.status
    err.data = data
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