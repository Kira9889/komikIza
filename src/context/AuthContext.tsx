import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { apiFetch, setToken, isBackendOnline, isServerDownError } from '../lib/api'
import type { User } from '../types'

export interface AuthResult {
  error?: string
  needsVerification?: boolean
  email?: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  register: (data: { username: string; email: string; password: string }) => Promise<AuthResult>
  login: (data: { email: string; password: string }) => Promise<AuthResult>
  loginWithGoogle: (code: string) => Promise<AuthResult>
  verifyEmail: (data: { email: string; code: string }) => Promise<AuthResult>
  resendCode: (email: string) => Promise<AuthResult>
  updateUsername: (username: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

export function isGmailAddress(email: string) {
  return /^[a-z0-9._%+-]+@(gmail|googlemail)\.com$/i.test(email.trim())
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'tenshi_user'
const LEGACY_STORAGE_KEY = 'izalib_user'
const LEGACY_USERS_KEY = 'izalib_users'
const USERS_KEY = 'tenshi_users'

interface AuthResponse {
  token: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const current = localStorage.getItem(STORAGE_KEY)
      if (current) return JSON.parse(current) as User | null
      // Migrasi sekali dari key lama IzaLib
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        return JSON.parse(legacy) as User | null
      }
      return null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  const persist = (u: User | null) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
    setUser(u)
  }

  // Validasi ulang sesi saat halaman dimuat (token masih valid? role terbaru?)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const online = await isBackendOnline()
      if (!online) {
        setLoading(false)
        return
      }
      try {
        const res = await apiFetch<{ user: User }>('/auth/me')
        if (!cancelled) persist(res.user)
      } catch (e: any) {
        if (e.status === 401) {
          setToken(null)
          if (!cancelled) persist(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const register = async ({
    username,
    email,
    password,
  }: {
    username: string
    email: string
    password: string
  }): Promise<AuthResult> => {
    if (!email || !password || !username) return { error: 'Semua field wajib diisi' }
    if (!isGmailAddress(email)) return { error: 'Pendaftaran hanya untuk email @gmail.com' }
    if (password.length < 6) return { error: 'Password minimal 6 karakter' }

    let online = await isBackendOnline()
    if (online) {
      try {
        const res = await apiFetch<AuthResponse & { needsVerification?: boolean; email?: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        })
        // Akun baru wajib verifikasi kode dulu sebelum dapat token.
        if (res.needsVerification) return { needsVerification: true, email: res.email ?? email }
        if (res.token) setToken(res.token)
        if (res.user) persist(res.user)
        return {}
      } catch (e: any) {
        // Backend mati di tengah jalan (502 / koneksi putus) → jatuh ke
        // error ramah di bawah, JANGAN tampilkan 502 ke user.
        if (!isServerDownError(e)) return { error: e.message || 'Gagal mendaftar' }
        online = false
      }
    }
    if (!online) {
      // Lokal pun wajib lewat backend agar alur verifikasi bisa dicoba
      // sebelum deploy. Jangan bikin sesi mock di sini.
      return { error: 'Gagal mendaftar. Coba lagi.' }
    }
    return { error: 'Gagal mendaftar. Coba lagi.' }
  }

  const login = async ({
    email,
    password,
  }: {
    email: string
    password: string
  }): Promise<AuthResult> => {
    if (!email || !password) return { error: 'Email dan password wajib diisi' }

    let online = await isBackendOnline()
    if (online) {
      try {
        const res = await apiFetch<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setToken(res.token)
        persist(res.user)
        return {}
      } catch (e: any) {
        if (e.data?.needsVerification) {
          return { error: e.message, needsVerification: true, email: e.data.email ?? email }
        }
        // Backend mati di tengah jalan (502 / koneksi putus) → diam-diam pakai
        // mock offline di bawah, JANGAN tampilkan 502 ke user.
        if (!isServerDownError(e)) return { error: e.message || 'Email atau password salah' }
        online = false
      }
    }

    if (!online) {
    // Mock auth (hanya saat backend offline) — termasuk akun admin demo.
    // DEV-only: Vite membuang blok ini dari production build,
    // jadi kredensial demo tidak masuk bundle publik. Di dev tetap bisa dipakai.
    if (
      import.meta.env.DEV &&
      (email === 'admin@tenshi.id' || email === 'admin@izalib.test') &&
      password === 'admin123'
    ) {
      persist({ id: 'admin', username: 'admin', email, role: 'admin' })
      return {}
    }
    const users = getRegistered()
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!found) return { error: 'Email atau password salah' }
    if (found.password !== password) return { error: 'Email atau password salah' }
    persist(found)
    return {}
    }
    return { error: 'Server tidak merespons. Coba lagi sebentar lagi.' }
  }

  const loginWithGoogle = async (code: string): Promise<AuthResult> => {
    if (!code) return { error: 'Kode Google tidak ada.' }
    try {
      const res = await apiFetch<AuthResponse>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      setToken(res.token)
      persist(res.user)
      return {}
    } catch (e: any) {
      return { error: e.message || 'Login Google gagal. Coba lagi.' }
    }
  }

  const verifyEmail = async ({ email, code }: { email: string; code: string }): Promise<AuthResult> => {
    if (!email || !code) return { error: 'Email dan kode wajib diisi' }
    try {
      const res = await apiFetch<AuthResponse>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      })
      setToken(res.token)
      persist(res.user)
      return {}
    } catch (e: any) {
      return { error: e.message || 'Gagal verifikasi' }
    }
  }

  const resendCode = async (email: string): Promise<AuthResult> => {
    if (!email) return { error: 'Email wajib diisi' }
    try {
      await apiFetch('/auth/resend-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      return {}
    } catch (e: any) {
      return { error: e.message || 'Gagal mengirim kode' }
    }
  }

  const updateUsername = async (username: string): Promise<AuthResult> => {
    const name = username.trim()
    if (name.length < 3) return { error: 'Username minimal 3 karakter' }
    if (name.length > 24) return { error: 'Username maksimal 24 karakter' }
    if (!user) return { error: 'Harus login' }
    if (name === user.username) return {}
    try {
      const res = await apiFetch<{ user: User }>('/me/username', {
        method: 'PUT',
        body: JSON.stringify({ username: name }),
      })
      persist(res.user)
      return {}
    } catch (e: any) {
      if (isServerDownError(e)) {
        // Backend offline: perbarui sesi lokal + daftar mock bila ada.
        const users = getRegistered().map(u =>
          u.id === user.id ? { ...u, username: name } : u,
        )
        saveRegistered(users)
        persist({ ...user, username: name })
        return {}
      }
      return { error: e.message || 'Gagal memperbarui username' }
    }
  }

  const logout = async () => {
    setToken(null)
    persist(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, loginWithGoogle, verifyEmail, resendCode, updateUsername, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

interface StoredUser extends User {
  password: string
}

function saveRegistered(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function getRegistered(): StoredUser[] {
  try {
    const current = localStorage.getItem(USERS_KEY)
    if (current) return JSON.parse(current) as StoredUser[]
    // Migrasi sekali dari key lama IzaLib
    const legacy = localStorage.getItem(LEGACY_USERS_KEY)
    if (legacy) {
      localStorage.setItem(USERS_KEY, legacy)
      localStorage.removeItem(LEGACY_USERS_KEY)
      return JSON.parse(legacy) as StoredUser[]
    }
    return []
  } catch {
    return []
  }
}

