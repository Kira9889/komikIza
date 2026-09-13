import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { apiFetch, setToken, isBackendOnline } from '../lib/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  register: (data: { username: string; email: string; password: string }) => Promise<{ error?: string }>
  login: (data: { email: string; password: string }) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'izalib_user'

interface AuthResponse {
  token: string
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as User | null
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
  }): Promise<{ error?: string }> => {
    if (!email || !password || !username) return { error: 'Semua field wajib diisi' }
    if (password.length < 6) return { error: 'Password minimal 6 karakter' }

    if (await isBackendOnline()) {
      try {
        const res = await apiFetch<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        })
        setToken(res.token)
        persist(res.user)
        return {}
      } catch (e: any) {
        return { error: e.message || 'Gagal mendaftar' }
      }
    }

    // Mock auth (backend offline)
    const users = getRegistered()
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { error: 'Email sudah terdaftar' }
    }
    const newUser: StoredUser = { id: `u-${Date.now()}`, username, email, role: 'user', password }
    users.push(newUser)
    saveRegistered(users)
    persist(newUser)
    return {}
  }

  const login = async ({
    email,
    password,
  }: {
    email: string
    password: string
  }): Promise<{ error?: string }> => {
    if (!email || !password) return { error: 'Email dan password wajib diisi' }

    if (await isBackendOnline()) {
      try {
        const res = await apiFetch<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setToken(res.token)
        persist(res.user)
        return {}
      } catch (e: any) {
        return { error: e.message || 'Email atau password salah' }
      }
    }

    // Mock auth (hanya saat backend offline) — termasuk akun admin demo
    if (email === 'admin@izalib.test' && password === 'admin123') {
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

  const logout = async () => {
    setToken(null)
    persist(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
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

function getRegistered(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem('izalib_users') ?? '[]') as StoredUser[]
  } catch {
    return []
  }
}

function saveRegistered(users: StoredUser[]) {
  localStorage.setItem('izalib_users', JSON.stringify(users))
}