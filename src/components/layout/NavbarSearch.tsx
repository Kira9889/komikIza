import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMangaList } from '../../api/library'
import type { Manga } from '../../types'
import { CloseIcon, SearchIcon } from '../../icons'

// Live search navbar: ketik 1 huruf langsung muncul judul yang mengandungnya.
// Dipakai 2x (desktop + mobile) via className responsif dari pemanggil.
export default function NavbarSearch({
  className = '',
  autoFocus = false,
  onPick,
}: {
  className?: string
  autoFocus?: boolean
  onPick?: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Manga[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Debounce 300ms: tiap ketik (termasuk 1 huruf) cari ke backend.
  useEffect(() => {
    const query = q.trim()
    if (!query) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const data = await fetchMangaList({ search: query })
        setResults(data.slice(0, 6))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  // Tutup saat klik di luar.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const goAll = () => {
    const query = q.trim()
    if (!query) return
    setOpen(false)
    setQ('')
    onPick?.()
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  const pick = () => {
    setOpen(false)
    setQ('')
    onPick?.()
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-(--line) bg-(--card-2) px-3 py-2 transition focus-within:border-primary-500/60">
        <SearchIcon className="h-4 w-4 shrink-0 text-general-400" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={e => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') goAll()
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Cari judul…"
          aria-label="Cari manga"
          className="w-full bg-transparent text-sm text-general-100 outline-none placeholder:text-general-400"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Hapus pencarian"
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-general-400 hover:text-general-100"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-xl border border-(--line) bg-(--card) shadow-2xl">
          {loading ? (
            <p className="px-4 py-3 text-sm text-general-400">Mencari…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-general-400">
              Tidak ketemu judul mengandung “{q.trim()}”.
            </p>
          ) : (
            <ul>
              {results.map(m => (
                <li key={m.id}>
                  <Link
                    to={`/manga/${m.slug}`}
                    onClick={pick}
                    className="flex items-center gap-3 px-3 py-2 transition hover:bg-white/5"
                  >
                    <img
                      src={m.cover_url}
                      alt=""
                      loading="lazy"
                      className="h-11 w-8 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-general-100">
                        {m.title}
                      </span>
                      <span className="text-[11px] uppercase text-general-400">{m.type}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!loading && (
            <button
              type="button"
              onClick={goAll}
              className="w-full border-t border-(--line) px-4 py-2.5 text-center text-sm font-semibold text-primary-500 transition hover:bg-white/5"
            >
              Lihat semua hasil
            </button>
          )}
        </div>
      )}
    </div>
  )
}
