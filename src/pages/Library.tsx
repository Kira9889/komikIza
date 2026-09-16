import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { seedManga } from '../data/seed'
import { fetchMangaList } from '../api/library'
import { isBackendOnline } from '../lib/api'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../context/AuthContext'
import type { Manga } from '../types'
import MangaCard from '../components/manga/MangaCard'
import AuthModal from '../components/auth/AuthModal'
import { LibraryIcon, ClockIcon, TrashIcon } from '../icons'

export default function Library() {
  const { user } = useAuth()
  const { likedIds, history, removeHistory, clearHistory } = useLibrary()
  const [tab, setTab] = useState<'bookmark' | 'history'>('bookmark')
  const [showAuth, setShowAuth] = useState(false)
  const [chibiOk, setChibiOk] = useState(true)
  const [mangas, setMangas] = useState<Manga[]>(() => seedManga)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const online = await isBackendOnline()
      // saat backend online, ambil data manga sungguhan dari database.
      // try/catch: backend bisa mati di tengah jalan (502) — jatuh ke seed,
      // JANGAN lempar error ke user.
      if (online) {
        try {
          const list = await fetchMangaList()
          if (!cancelled) setMangas(list)
          return
        } catch {
          /* backend mati mendadak → pakai seed di bawah */
        }
      }
      if (!cancelled) setMangas(seedManga)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Tamu belum login: gerbang chibi + tombol masuk (popup).
  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
        {chibiOk && (
          <img
            src="/lock-chibi.png"
            alt="Masuk untuk membuka library"
            onError={() => setChibiOk(false)}
            className="h-48 w-48 object-contain"
          />
        )}
        <h1 className="mt-4 font-display text-2xl font-extrabold">Library Terkunci</h1>
        <p className="mt-2 text-sm text-general-400">
          Masuk untuk menyimpan bookmark dan melihat riwayat bacaanmu di semua perangkat.
        </p>
        <button
          onClick={() => setShowAuth(true)}
          className="btn-primary mt-6 rounded-lg px-8 py-2.5 text-sm font-semibold"
        >
          Masuk
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    )
  }

  const likedMangas = mangas.filter(m => likedIds.includes(m.id))
  const byId = new Map(mangas.map(m => [m.id, m]))
  const historyRows = history
    .map(h => ({
      entry: h,
      manga: h.slug
        ? { id: h.manga_id, slug: h.slug, title: h.title ?? 'Tanpa judul', cover_url: h.cover_url ?? '' }
        : byId.get(h.manga_id),
    }))
    .filter((r): r is { entry: (typeof history)[number]; manga: Manga | { id: string; slug: string; title: string; cover_url: string } } => !!r.manga)

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex items-center gap-3 py-6">
        <LibraryIcon className="h-7 w-7 text-primary-500" />
        <div>
          <h1 className="font-display text-2xl font-extrabold">Library</h1>
          <p className="text-sm text-general-400">
            {likedMangas.length} bookmark • {historyRows.length} riwayat
          </p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-black/20 p-1 w-fit">
        {(['bookmark', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
              tab === t ? 'bg-primary-500 text-white' : 'text-general-400 hover:text-general-100'
            }`}
          >
            {t === 'bookmark' ? 'Bookmark' : 'Riwayat'}
          </button>
        ))}
      </div>

      {tab === 'bookmark' ? (
        likedMangas.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center text-general-400">
            <LibraryIcon className="h-16 w-16 opacity-40" />
            <p className="text-lg font-semibold text-general-300">Library kamu masih kosong</p>
            <p>Tekan ikon di halaman detail untuk menambahkan komik ke library favoritmu.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {likedMangas.map(m => (
              <MangaCard key={m.id} manga={m} />
            ))}
          </div>
        )
      ) : historyRows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-general-400">
          <ClockIcon className="h-16 w-16 opacity-40" />
          <p className="text-lg font-semibold text-general-300">Belum ada riwayat baca</p>
          <p>Buka chapter apapun dan posisimu otomatis tersimpan di sini.</p>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex justify-end">
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              <TrashIcon className="h-4 w-4" />
              Hapus semua
            </button>
          </div>
          <div className="space-y-2">
            {historyRows.map(({ entry, manga }) => (
              <div
                key={entry.manga_id}
                className="flex items-center gap-3 rounded-xl border border-(--line) bg-(--card) p-3"
              >
                <Link to={`/manga/${manga.slug}`} className="shrink-0">
                  {manga.cover_url ? (
                    <img
                      src={manga.cover_url}
                      alt={manga.title}
                      className="h-16 w-12 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-16 w-12 place-items-center rounded-md bg-white/5 text-xs text-general-400">
                      ?
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/manga/${manga.slug}`}
                    className="truncate block font-semibold text-general-100 hover:text-primary-500"
                  >
                    {manga.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-general-400">
                    Terakhir: {entry.chapter_name || 'Chapter'} • {timeAgo(entry.updated_at)}
                  </p>
                </div>
                <Link
                  to={`/manga/${manga.slug}/chapter/${entry.chapter_id}`}
                  className="btn-primary shrink-0 rounded-lg px-4 py-2 text-xs font-semibold"
                >
                  Lanjutkan
                </Link>
                <button
                  onClick={() => removeHistory(entry.manga_id)}
                  aria-label="Hapus riwayat"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-general-400 transition hover:bg-white/10 hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
