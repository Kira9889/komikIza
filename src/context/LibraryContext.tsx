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

interface HistoryEntry {
  manga_id: string
  chapter_id: string
  chapter_name: string
  updated_at: string
  slug?: string
  title?: string
  cover_url?: string
}

interface LibraryContextValue {
  likedIds: string[]
  toggleLike: (id: string) => void
  isLiked: (id: string) => boolean
  history: HistoryEntry[]
  recordHistory: (entry: { manga_id: string; chapter_id: string; chapter_name: string }) => void
  removeHistory: (mangaId: string) => void
  clearHistory: () => void
  isChapterRead: (mangaId: string, chapterId: string) => boolean
  mergeReadChapters: (mangaId: string, ids: string[]) => void
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

function legacyKey(key: string): string {
  return key.replace(/^tenshi_/, 'izalib_')
}

function loadLocal(key: string): string[] {
  try {
    const current = localStorage.getItem(key)
    if (current) return JSON.parse(current) as string[]
    // Migrasi sekali dari key lama IzaLib
    const legacy = localStorage.getItem(legacyKey(key))
    if (legacy) {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(legacyKey(key))
      return JSON.parse(legacy) as string[]
    }
    return []
  } catch {
    return []
  }
}

function loadLocalHistory(key: string): HistoryEntry[] {
  try {
    const current = localStorage.getItem(key)
    if (current) {
      const raw = JSON.parse(current) as HistoryEntry[]
      return Array.isArray(raw) ? raw : []
    }
    // Migrasi sekali dari key lama IzaLib
    const legacy = localStorage.getItem(legacyKey(key))
    if (legacy) {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(legacyKey(key))
      const raw = JSON.parse(legacy) as HistoryEntry[]
      return Array.isArray(raw) ? raw : []
    }
    return []
  } catch {
    return []
  }
}

function loadLocalReadMap(key: string): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string[]>
      if (parsed && typeof parsed === 'object') return parsed
    }
    const legacy = localStorage.getItem(legacyKey(key))
    if (legacy) {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(legacyKey(key))
      const parsed = JSON.parse(legacy) as Record<string, string[]>
      if (parsed && typeof parsed === 'object') return parsed
    }
    return {}
  } catch {
    return {}
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? 'guest'
  const storageKey = useMemo(() => `tenshi_likes_${userId}`, [userId])
  const historyKey = useMemo(() => `tenshi_history_${userId}`, [userId])
  const readKey = useMemo(() => `tenshi_read_${userId}`, [userId])

  const [likedIds, setLikedIds] = useState<string[]>(() => loadLocal(storageKey))
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadLocalHistory(historyKey))
  const [readMap, setReadMap] = useState<Record<string, string[]>>(() => loadLocalReadMap(readKey))

  // User yang datanya sedang dipegang state. Mencegah efek simpan di bawah
  // menulis data user lama (mis. guest) ke slot user baru sebelum
  // sinkronisasi selesai — itu yang bikin data sehabis login telat/ketukar.
  const loadedUserRef = useRef<string>(userId)

  // Simpan ke localStorage sebagai cache/mirror
  useEffect(() => {
    if (loadedUserRef.current !== userId) return
    localStorage.setItem(storageKey, JSON.stringify(likedIds))
  }, [likedIds, storageKey, userId])

  useEffect(() => {
    if (loadedUserRef.current !== userId) return
    try {
      const entries = Object.entries(readMap).slice(-100)
      localStorage.setItem(readKey, JSON.stringify(Object.fromEntries(entries)))
    } catch {
      /* abaikan */
    }
  }, [readMap, readKey, userId])

  useEffect(() => {
    if (loadedUserRef.current !== userId) return
    localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 100)))
  }, [history, historyKey, userId])

  // Saat user berubah: tampilkan cache lokal user itu SEKEITKA (tanpa
  // menunggu network), lalu segarkan favorit + riwayat dari backend.
  useEffect(() => {
    setLikedIds(loadLocal(storageKey))
    setHistory(loadLocalHistory(historyKey))
    setReadMap(loadLocalReadMap(readKey))
    loadedUserRef.current = userId
    let cancelled = false
    ;(async () => {
      const online = await isBackendOnline()
      if (online && user) {
        try {
          const [likes, hist] = await Promise.all([
            apiFetch<{ ids: string[] }>('/me/likes'),
            apiFetch<HistoryEntry[]>('/me/history').catch(() => [] as HistoryEntry[]),
          ])
          if (!cancelled) {
            setLikedIds(likes.ids)
            setHistory(hist)
          }
        } catch {
          /* tetap pakai cache lokal */
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

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

  const isChapterRead = (mangaId: string, chapterId: string) =>
    (readMap[mangaId] ?? []).includes(chapterId)

  const mergeReadChapters = (mangaId: string, ids: string[]) => {
    if (!ids.length) return
    setReadMap(prev => {
      const merged = Array.from(new Set([...(prev[mangaId] ?? []), ...ids]))
      if (merged.length === (prev[mangaId] ?? []).length) return prev
      return { ...prev, [mangaId]: merged }
    })
  }

  const recordHistory = (entry: { manga_id: string; chapter_id: string; chapter_name: string }) => {
    const full: HistoryEntry = { ...entry, updated_at: new Date().toISOString() }
    setHistory(prev => [full, ...prev.filter(h => h.manga_id !== entry.manga_id)].slice(0, 100))
    // Tandai chapter ini sudah dibaca (abu-abu di daftar).
    if (entry.chapter_id) mergeReadChapters(entry.manga_id, [entry.chapter_id])
    if (user) {
      isBackendOnline().then(online => {
        if (!online) return
        apiFetch('/me/history', { method: 'PUT', body: JSON.stringify(entry) }).catch(err =>
          console.error(err),
        )
      })
    }
  }

  const removeHistory = (mangaId: string) => {
    setHistory(prev => prev.filter(h => h.manga_id !== mangaId))
    setReadMap(prev => {
      if (!prev[mangaId]) return prev
      const next = { ...prev }
      delete next[mangaId]
      return next
    })
    if (user) {
      isBackendOnline().then(online => {
        if (!online) return
        apiFetch(`/me/history/${mangaId}`, { method: 'DELETE' }).catch(err => console.error(err))
      })
    }
  }

  const clearHistory = () => {
    setHistory([])
    setReadMap({})
    if (user) {
      isBackendOnline().then(online => {
        if (!online) return
        apiFetch('/me/history', { method: 'DELETE' }).catch(err => console.error(err))
      })
    }
  }

  return (
    <LibraryContext.Provider
      value={{ likedIds, toggleLike, isLiked, history, recordHistory, removeHistory, clearHistory, isChapterRead, mergeReadChapters }}
    >
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