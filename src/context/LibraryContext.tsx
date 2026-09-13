import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { apiFetch, isBackendOnline } from '../lib/api'

interface LibraryContextValue {
  likedIds: string[]
  toggleLike: (id: string) => void
  isLiked: (id: string) => boolean
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

function loadLocal(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const storageKey = useMemo(() => `izalib_likes_${user?.id ?? 'guest'}`, [user?.id])

  const [likedIds, setLikedIds] = useState<string[]>(() => loadLocal(storageKey))

  // Simpan ke localStorage sebagai cache/mirror
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(likedIds))
  }, [likedIds, storageKey])

  // Saat user berubah: ambil favorit dari backend (jika online),
  // atau dari localStorage (jika offline).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const online = await isBackendOnline()
      if (online && user) {
        try {
          const res = await apiFetch<{ ids: string[] }>('/me/likes')
          if (!cancelled) setLikedIds(res.ids)
          return
        } catch {
          /* lanjut ke fallback lokal */
        }
      }
      if (!cancelled) setLikedIds(loadLocal(storageKey))
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const toggleLike = (id: string) => {
    setLikedIds(prev => {
      const already = prev.includes(id)
      const next = already ? prev.filter(x => x !== id) : [...prev, id]
      return next
    })
    // Sinkron ke backend (fire-and-forget); jika offline, biarkan hanya di localStorage.
    if (user) {
      isBackendOnline().then(online => {
        if (!online) return
        apiFetch(`/me/likes/${id}`, { method: 'POST', body: '{}' }).catch(err =>
          console.error(err),
        )
      })
    }
  }

  const isLiked = (id: string) => likedIds.includes(id)

  return (
    <LibraryContext.Provider value={{ likedIds, toggleLike, isLiked }}>
      {children}
    </LibraryContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}