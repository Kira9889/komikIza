import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchMangaBySlug, fetchChapters } from '../api/library'
import type { Manga, Chapter } from '../types'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../context/AuthContext'
import {
  EyeIcon,
  StarIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '../icons'

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  return `${n}`
}

export default function MangaDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [manga, setManga] = useState<Manga | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [newestFirst, setNewestFirst] = useState(true)
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [chaptersError, setChaptersError] = useState('')
  const [slowServer, setSlowServer] = useState(false)
  const { isLiked, toggleLike } = useLibrary()
  const { user } = useAuth()
  const navigate = useNavigate()

  const loadChapters = async (mangaId: string) => {
    setChaptersLoading(true)
    setChaptersError('')
    try {
      // Slim: daftar tanpa blob pages (jauh lebih ringan).
      const ch = await fetchChapters(mangaId, { slim: true })
      setChapters(ch)
    } catch {
      setChaptersError('Gagal memuat daftar chapter. Server mungkin sedang aktif kembali dari mode tidur.')
    } finally {
      setChaptersLoading(false)
    }
  }

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setChaptersLoading(true)
    setChaptersError('')
    fetchMangaBySlug(slug)
      .then(m => {
        setLoading(false)
        if (!m) return
        setManga(m)
        void loadChapters(m.id)
      })
      .catch(() => setLoading(false))
  }, [slug])

  // Saat cold start (>15 detik) beri tahu user bahwa server sedang dibangunkan.
  useEffect(() => {
    if (!chaptersLoading) {
      setSlowServer(false)
      return
    }
    const t = setTimeout(() => setSlowServer(true), 15000)
    return () => clearTimeout(t)
  }, [chaptersLoading])

  if (loading) return <DetailSkeleton />

  if (!manga) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-general-400">
        Judul tidak ditemukan.
      </div>
    )
  }

  const liked = isLiked(manga.id)
  const latest = chapters[chapters.length - 1]
  const orderedChapters = newestFirst ? [...chapters].reverse() : chapters

  return (
    <div>
      {/* Hero: card info tampil di depan banner */}
      <div className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${manga.banner_url ?? manga.cover_url})` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-(--bg) via-(--bg)/65 to-(--bg)/25" />

        <div className="relative mx-auto max-w-6xl px-4 pb-6 pt-24 md:pt-32">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
          <Link
            to={`/manga/${manga.slug}/chapter/${latest?.id ?? manga.id}`}
            className="group mx-auto w-44 shrink-0 md:mx-0 md:w-56"
          >
            <div className="overflow-hidden rounded-lg border border-(--line) bg-(--card-2) shadow-2xl">
              <img
                src={manga.cover_url}
                alt={manga.title}
                className="aspect-3/4 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </Link>

          <div className="flex-1 pt-6 md:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              {manga.genres.map(g => (
                <span
                  key={g.id}
                  className="rounded border border-(--line) bg-(--card-2) px-2 py-0.5 text-xs font-semibold text-primary-400"
                >
                  {g.name}
                </span>
              ))}
            </div>

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">
              {manga.title}
            </h1>
            {manga.original_name && (
              <p className="mt-1 text-sm text-general-400">{manga.original_name}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-general-300">
              <span className="flex items-center gap-1.5">
                <EyeIcon className="h-4 w-4 text-general-400" />
                {formatNumber(manga.views_count)} views
              </span>
              <span className="flex items-center gap-1.5">
                <StarIcon className="h-4 w-4 text-primary-400" />
                {manga.rating.toFixed(2)} ({formatNumber(manga.rating_count)})
              </span>
              <span className="flex items-center gap-1.5">
                <BookmarkFilledIcon className="h-4 w-4 text-primary-400" />
                {formatNumber(manga.follows_count)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-general-400">
              <span className="rounded bg-(--card-2) px-2 py-1">Status: {manga.status}</span>
              <span className="rounded bg-(--card-2) px-2 py-1">{manga.type}</span>
              <span className="rounded bg-(--card-2) px-2 py-1">
                {manga.release_date ? new Date(manga.release_date).getFullYear() || '-' : '-'}
              </span>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-general-300">
              {manga.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {chaptersLoading ? (
                <span className="flex items-center gap-2 rounded-lg border border-(--line) px-5 py-2.5 text-sm text-general-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-primary-500" />
                  Memuat chapter…
                </span>
              ) : latest ? (
                <Link
                  to={`/manga/${manga.slug}/chapter/${latest.id}`}
                  className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
                >
                  Baca Terbaru
                </Link>
              ) : (
                <span className="text-sm text-general-400">Belum ada chapter</span>
              )}
              <button
                onClick={() => {
                  if (!user) {
                    navigate('/login')
                    return
                  }
                  toggleLike(manga.id)
                }}
                className={`btn flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  liked
                    ? 'bg-primary-500 text-white'
                    : 'btn-ghost'
                }`}
              >
                {liked ? (
                  <BookmarkFilledIcon className="h-4.5 w-4.5" />
                ) : (
                  <BookmarkIcon className="h-4.5 w-4.5" />
                )}
                {liked ? 'Di Library' : 'Tambah ke Library'}
              </button>
            </div>
          </div>
        </div>
        </div>
        </div>

      <div className="mx-auto max-w-6xl px-4">
        {/* Chapter list */}
        <section className="mt-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold">Daftar Chapter</h2>
              <span className="text-sm text-general-400">({chapters.length})</span>
            </div>
            {chapters.length > 1 && (
              <button
                onClick={() => setNewestFirst(v => !v)}
                aria-label={newestFirst ? 'Urutkan dari chapter terlama' : 'Urutkan dari chapter terbaru'}
                title={newestFirst ? 'Terbaru dulu' : 'Terlama dulu'}
                className="flex items-center gap-1.5 rounded-lg border border-(--line) px-3 py-1.5 text-xs font-semibold text-general-300 transition hover:border-primary-500/50 hover:text-primary-500"
              >
                {newestFirst ? (
                  <ArrowUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4" />
                )}
                {newestFirst ? 'Terbaru' : 'Terlama'}
              </button>
            )}
          </div>

          {chaptersLoading ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-(--line) bg-(--card) px-4 py-12 text-center">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-primary-500" />
              <p className="text-sm font-medium text-general-100">
                Menghubungkan ke server & memuat data...
              </p>
              {slowServer ? (
                <p className="max-w-sm text-xs leading-relaxed text-general-400">
                  Server gratis sedang aktif kembali dari mode tidur, bisa memakan waktu ±1 menit.
                  Mohon tunggu sebentar.
                </p>
              ) : (
                <p className="text-xs text-general-400">Mohon tunggu sebentar.</p>
              )}
            </div>
          ) : chaptersError ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-10 text-center">
              <p className="text-sm font-medium text-red-300">{chaptersError}</p>
              <button
                onClick={() => void loadChapters(manga.id)}
                className="rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-600"
              >
                Coba lagi
              </button>
            </div>
          ) : chapters.length === 0 ? (
            <p className="mt-4 rounded-xl border border-(--line) bg-(--card) px-4 py-10 text-center text-sm text-general-400">
              Belum ada chapter untuk judul ini.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {orderedChapters.map(ch => (
                <Link
                  key={ch.id}
                  to={`/manga/${manga.slug}/chapter/${ch.id}`}
                  className="flex items-center justify-between rounded-lg border border-(--line) bg-(--card) px-4 py-3 text-sm transition hover:border-primary-500/40 hover:bg-(--card-2)"
                >
                  <span className="font-medium text-general-100">{ch.name}</span>
                  <span className="text-xs text-general-400">
                    {formatTimestamp(ch.release_timestamp)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Info tambahan */}
        <section className="mt-10 rounded-xl border border-(--line) bg-(--card) p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-general-300">
            Informasi
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <InfoRow label="Judul Alternatif" value={manga.alternative_names.join(', ') || '-'} />
            <InfoRow label="Pengarang" value={manga.authors.map(a => a.name).join(', ') || '-'} />
            <InfoRow label="Tipe" value={manga.type} />
            <InfoRow label="Tag" value={manga.tags.join(', ')} />
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 text-general-400">{label}</span>
      <span className="font-medium text-general-100">{value}</span>
    </div>
  )
}

function formatTimestamp(ts: number) {
  const diff = Date.now() / 1000 - ts
  const days = Math.floor(diff / 86400)
  if (days <= 0) return 'Hari ini'
  if (days === 1) return 'Kemarin'
  if (days < 30) return `${days} hari lalu`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} bulan lalu`
  return `${Math.floor(months / 12)} tahun lalu`
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="animate-pulse h-56 w-full rounded-xl bg-(--card) md:h-72" />
      <div className="mt-4 flex flex-col gap-6 md:flex-row">
        <div className="animate-pulse h-64 w-44 rounded-lg bg-(--card) md:w-56" />
        <div className="flex-1 space-y-3">
          <div className="animate-pulse h-4 w-40 rounded bg-(--card)" />
          <div className="animate-pulse h-8 w-64 rounded bg-(--card)" />
          <div className="animate-pulse h-4 w-48 rounded bg-(--card)" />
          <div className="animate-pulse h-20 w-full max-w-xl rounded bg-(--card)" />
        </div>
      </div>
    </div>
  )
}