import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchChapters, fetchMangaBySlug, fetchReadChapters, fetchShinigamiPages, recordView } from '../api/library'
import Comments from '../components/manga/Comments'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../context/AuthContext'
import { queryKeys } from '../lib/queryKeys'
import type { Manga, Chapter } from '../types'
import { toDriveImage } from '../lib/drive'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookIcon,
  HomeIcon,
  MenuIcon,
  CloseIcon,
} from '../icons'

export default function ReadChapter() {
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>()
  // Manga + daftar chapter lewat React Query: share cache dengan halaman
  // MangaDetail mil judul yang sama, jadi pindah chapter tidak mengunduh
  // ulang manga + daftar chapter + read-chapters berkali-kali.
  const mangaQuery = useQuery({
    queryKey: queryKeys.manga(slug ?? ''),
    queryFn: () => fetchMangaBySlug(slug ?? ''),
    enabled: !!slug,
    // Beri kesempatan backend bangun dari cold start sebelum menyerah.
    retry: 2,
    retryDelay: attempt => Math.min(1500 * 2 ** attempt, 6000),
  })
  const chaptersQuery = useQuery({
    queryKey: queryKeys.chapters(mangaQuery.data?.id ?? ''),
    queryFn: () => fetchChapters(mangaQuery.data!.id, { slim: true }),
    enabled: !!mangaQuery.data,
    retry: 2,
    retryDelay: attempt => Math.min(1500 * 2 ** attempt, 6000),
  })
  const manga: Manga | null = mangaQuery.data ?? null
  const chapters: Chapter[] = chaptersQuery.data ?? []
  const [current, setCurrent] = useState<Chapter | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [readerControlsOpen, setReaderControlsOpen] = useState(false)
  // Status pemuatan halaman gambar per chapter (bukan per komponen), supaya
  // pindah chapter tidak menampilkan "Belum ada halaman" sesaat.
  const [pagesState, setPagesState] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; error?: string }>({
    key: '',
    status: 'loading',
  })
  const [pagesAttempt, setPagesAttempt] = useState(0)
  const { recordHistory, isChapterRead, mergeReadChapters } = useLibrary()
  const { user } = useAuth()
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const activeChapterRef = useRef<HTMLAnchorElement>(null)

  // Klik di luar tombol + panel → tutup daftar chapter.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuBtnRef.current?.contains(t)) return
      if (menuPanelRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  // Scroll panel ke chapter yang sedang dibaca saat dibuka.
  useEffect(() => {
    if (menuOpen) activeChapterRef.current?.scrollIntoView({ block: 'nearest' })
  }, [menuOpen])

  // Chrome reader (header + navigasi + daftar chapter) disembunyikan
  // saat membaca, muncul lagi saat gambar diketuk.
  const toggleChrome = () => {
    const opening = !readerControlsOpen
    setReaderControlsOpen(opening)
    setMenuOpen(opening)
  }

  useEffect(() => {
    document.title =
      manga && current ? `${manga.title} ${current.name} — Tenshi.My.id` : 'Baca Chapter — Tenshi.My.id'
  }, [manga?.title, current?.name])

  // Header overlay makin solid saat halaman digulir
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reset menu + scroll tiap slug/chapter berubah (tanpa unduhan ulang).
  useEffect(() => {
    if (!slug) return
    setMenuOpen(false)
    setReaderControlsOpen(false)
    // Setiap ganti chapter selalu mulai membaca dari halaman paling atas.
    window.scrollTo(0, 0)
  }, [slug, chapterId])

  // Pilih chapter aktif dari cache (tanpa fetch — manga/chapters via React Query).
  // Pertahankan pages yang sudah dimuat saat daftar chapter di-refetch,
  // supaya gambar tidak hilang di tengah membaca.
  useEffect(() => {
    setCurrent(prev => {
      const found = chapters.find(c => c.id === chapterId) ?? null
      if (!found) return null
      if (prev && prev.id === found.id && prev.pages.length > 0 && found.pages.length === 0) {
        return { ...found, pages: prev.pages }
      }
      return found
    })
  }, [chapters, chapterId])

  // Cache dari server/klien bisa saja kosong atau tidak memuat chapter ini
  // (mis. daftar lama, cold start, atau data fallback). Saat itu terjadi,
  // minta ulang sekali agar halaman tidak berhenti di "Memuat chapter…".
  const healRef = useRef('')
  useEffect(() => {
    if (!manga || !chapterId) return
    if (chaptersQuery.isPending || chaptersQuery.isFetching) return
    if (chapters.some(c => c.id === chapterId)) return
    const key = `${manga.id}:${chapterId}`
    if (healRef.current === key) return
    healRef.current = key
    void chaptersQuery.refetch()
  }, [manga?.id, chapterId, chapters, chaptersQuery.isPending, chaptersQuery.isFetching])

  // Manga null bisa berasal dari cache fallback saat backend sempat mati.
  const mangaHealRef = useRef('')
  useEffect(() => {
    if (!slug) return
    if (mangaQuery.isPending || mangaQuery.isFetching) return
    if (mangaQuery.data) return
    if (mangaHealRef.current === slug) return
    mangaHealRef.current = slug
    void mangaQuery.refetch()
  }, [slug, mangaQuery.data, mangaQuery.isPending, mangaQuery.isFetching])

  // Pages, riwayat, view, read-chapters hanya untuk chapter yang sedang dibaca.
  const activeOnceRef = useRef<string | null>(null)
  useEffect(() => {
    if (!manga || !current) return
    const key = `${manga.id}:${current.id}`
    if (activeOnceRef.current === key) return
    activeOnceRef.current = key
    let cancelled = false
    ;(async () => {
      let withPages = current
      // Pages diambil terpisah hanya bila daftar tidak membawanya
      // (mode slim online). Mode offline/mock membawa pages langsung.
      if (!current.pdf_url && current.pages.length === 0) {
        setPagesState({ key, status: 'loading' })
        try {
          const pages = await fetchShinigamiPages(current.id)
          withPages = { ...current, pages }
        } catch (e) {
          console.error(e)
          if (cancelled) return
          // Izinkan percobaan ulang lewat tombol "Coba lagi".
          activeOnceRef.current = null
          setPagesState({ key, status: 'error', error: 'Gagal memuat halaman chapter.' })
          return
        }
      }
      if (cancelled) return
      setPagesState({ key, status: 'ready' })
      setCurrent(withPages)
      recordHistory({ manga_id: manga.id, chapter_id: withPages.id, chapter_name: withPages.name })
      recordView(manga.id)
      if (user) {
        fetchReadChapters(manga.id).then(ids => mergeReadChapters(manga.id, ids))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [manga?.id, current?.id, user?.id, pagesAttempt])

  const retryAll = () => {
    if (mangaQuery.isError || !mangaQuery.data) void mangaQuery.refetch()
    if (manga && (chaptersQuery.isError || !chapters.some(c => c.id === chapterId))) {
      void chaptersQuery.refetch()
    }
    activeOnceRef.current = null
    setPagesAttempt(n => n + 1)
  }

  // Sedang memuat / mencoba memulihkan data.
  const resolving =
    mangaQuery.isPending ||
    (!manga && mangaQuery.isFetching) ||
    (!!manga && chaptersQuery.isPending) ||
    (!!manga && !current && chaptersQuery.isFetching)

  if (resolving) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-3 px-4 py-24 text-center text-general-400">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-primary-500" />
        <p className="text-sm">Memuat chapter…</p>
      </div>
    )
  }

  if (mangaQuery.isError || chaptersQuery.isError) {
    return (
      <ReaderMessage
        title="Gagal memuat chapter"
        message="Server tidak merespons atau sedang sibuk. Coba lagi sebentar lagi."
        onRetry={retryAll}
        backTo={slug ? `/manga/${slug}` : '/'}
      />
    )
  }

  if (!manga) {
    return (
      <ReaderMessage
        title="Judul tidak ditemukan"
        message="Judul ini mungkin sudah dihapus atau tautannya salah."
        onRetry={retryAll}
        backTo="/"
      />
    )
  }

  if (!current) {
    return (
      <ReaderMessage
        title="Chapter tidak ditemukan"
        message="Chapter ini mungkin sudah dihapus. Silakan pilih chapter lain dari daftar seri."
        onRetry={retryAll}
        backTo={`/manga/${manga.slug}`}
      />
    )
  }

  const idx = chapters.findIndex(c => c.id === current.id)
  const prev = idx > 0 ? chapters[idx - 1] : null
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null
  const contentKey = `${manga.id}:${current.id}`
  const pagesStatus = pagesState.key === contentKey ? pagesState.status : 'loading'
  const pagesError = pagesStatus === 'error' ? pagesState.error : undefined

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0d] text-white">
      {/* Navbar sticky transparan di atas konten baca (geser hilang saat chrome disembunyikan) */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          readerControlsOpen ? 'translate-y-0' : '-translate-y-full'
        } ${
          scrolled
         
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              ref={menuBtnRef}
              onClick={() => setMenuOpen(o => !o)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-black/20 text-neutral-200 transition hover:border-primary-500 hover:text-primary-500"
              aria-label="Daftar chapter"
            >
              {menuOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </button>
            <Link
              to="/"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-black/20 text-neutral-300 transition hover:border-primary-500 hover:text-primary-500"
              aria-label="Kembali ke beranda"
            >
              <HomeIcon className="h-4 w-4" />
            </Link>
            <Link
              to={`/manga/${manga.slug}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/15 bg-black/20 text-neutral-300 transition hover:border-primary-500 hover:text-primary-500"
              aria-label="Kembali ke info seri"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-neutral-100">{manga.title}</div>
              <div className="truncate text-xs text-neutral-400">{current.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!current.pdf_url && pagesStatus === 'ready' && (
              <span className="hidden rounded bg-white/5 px-2 py-1 text-xs text-neutral-400 sm:block">
                {current.pages.length} halaman
              </span>
            )}
            {next && (
              <Link
                to={`/manga/${manga.slug}/chapter/${next.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Berikutnya
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Daftar chapter: dropdown ramping rata kiri agar tidak menutupi komik */}
        {menuOpen && (
          <div className="mx-auto max-w-5xl px-4 pt-1 pb-2">
            <div
              ref={menuPanelRef}
              className="max-h-60 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-white/10 bg-[#141416]/95 p-1.5 shadow-2xl backdrop-blur-md"
            >
              {chapters.map(ch => {
                const active = ch.id === current.id
                const read = !active && isChapterRead(manga.id, ch.id)
                return (
                  <Link
                    key={ch.id}
                    ref={active ? activeChapterRef : undefined}
                    to={`/manga/${manga.slug}/chapter/${ch.id}`}
                    className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition ${
                      active
                        ? 'bg-primary-500/15 font-semibold text-primary-400'
                        : read
                          ? 'text-neutral-600 hover:bg-white/5'
                          : 'text-neutral-300 hover:bg-white/5 hover:text-neutral-100'
                    }`}
                  >
                    <span className="truncate">{ch.name}</span>
                    {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Konten */}
      {current.pdf_url ? (
        <>
          <div className="mx-auto w-full max-w-4xl flex-1 px-4 pt-16 pb-6">
            <div className="overflow-hidden rounded-lg border border-white/10">
              <iframe
                src={current.pdf_url}
                title={`${manga.title} ${current.name}`}
                className="h-[82vh] w-full"
                allow="autoplay"
                loading="lazy"
              />
            </div>
          </div>
          <EndNav prev={prev} next={next} mangaSlug={manga.slug} />
        </>
      ) : pagesStatus === 'loading' || pagesStatus === 'error' ? (
        pagesStatus === 'error' ? (
          <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-3 px-4 py-24 text-center">
            <p className="text-sm text-red-300">{pagesError ?? 'Gagal memuat halaman chapter.'}</p>
            <button
              onClick={retryAll}
              className="rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-600"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <div className="mx-auto flex min-h-[60vh] w-full max-w-200 flex-col items-center justify-center gap-3 px-4 py-24 text-center text-neutral-400">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-primary-500" />
            <p className="text-sm">Memuat halaman…</p>
          </div>
        )
      ) : current.pages.length === 0 ? (
        <p className="min-h-screen py-24 text-center text-neutral-400">
          Belum ada halaman. Scroll untuk membaca.
        </p>
      ) : (
        <>
          {/* Strip vertikal kontinu ala Webtoon */}
          <div className={readerControlsOpen ? 'pt-14' : 'pt-0'}>
            {current.pages.map((p, i) => (
              <ChapterImage
                key={`${current.id}-${i}`}
                src={toDriveImage(p.url)}
                alt={`${manga.title} ${current.name} hal ${i + 1}`}
                index={i}
                onClick={toggleChrome}
              />
            ))}
          </div>
          <EndNav prev={prev} next={next} mangaSlug={manga.slug} />
        </>
      )}

      <div className="mx-auto w-full max-w-200 px-4 pb-8">
        <Comments mangaId={manga.id} chapterId={current.id} />
      </div>

      {readerControlsOpen && (
        <ReaderControls
          mangaSlug={manga.slug}
          current={current}
          prev={prev}
          next={next}
          onClose={() => setReaderControlsOpen(false)}
        />
      )}
    </div>
  )
}

function ReaderMessage({
  title,
  message,
  onRetry,
  backTo,
}: {
  title: string
  message: string
  onRetry: () => void
  backTo: string
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <h1 className="text-lg font-bold text-neutral-100">{title}</h1>
      <p className="text-sm leading-relaxed text-neutral-400">{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onRetry}
          className="rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-600"
        >
          Coba lagi
        </button>
        <Link
          to={backTo}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-primary-500 hover:text-primary-400"
        >
          Kembali
        </Link>
      </div>
    </div>
  )
}

function ChapterImage({
  src,
  alt,
  index,
  onClick,
}: {
  src: string
  alt: string
  index: number
  onClick: () => void
}) {
  const [loaded, setLoaded] = useState(false)
  const [direct, setDirect] = useState(false)
  const shown = direct ? directImageUrl(src) : src

  return (
    <div className="relative mx-auto w-full max-w-200 bg-neutral-900">
      {/* Skeleton hanya muncul sebagai latar belakang absolut agar tidak merusak tinggi layout */}
      {!loaded && (
        <div className="absolute inset-0 min-h-100 animate-pulse bg-white/5" />
      )}

      <img
        src={shown}
        alt={alt}
        loading={index > 2 ? 'lazy' : 'eager'}
        onLoad={() => setLoaded(true)}
        // Sekali saja: kalau proxy backend gagal (mis. CDN sumber menolak
        // IP server), coba URL CDN langsung di browser.
        onError={() => {
          if (!direct) setDirect(true)
        }}
        onClick={onClick}
        className={`block h-auto w-full cursor-pointer transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}

// Ambil URL CDN asli dari balik proxy /api/shinigami/image?url=...
function directImageUrl(src: string): string {
  try {
    const u = new URL(src, 'https://tenshi.my.id')
    if (u.pathname === '/api/shinigami/image') {
      const direct = u.searchParams.get('url')
      if (direct) return direct
    }
  } catch {
    /* abaikan, pakai src asli */
  }
  return src
}

function ReaderControls({
  mangaSlug,
  current,
  prev,
  next,
  onClose,
}: {
  mangaSlug: string
  current: Chapter
  prev: Chapter | null
  next: Chapter | null
  onClose: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-5" role="dialog" aria-label="Navigasi chapter">
      <div className="mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-white/15 bg-[#151519]/95 p-2 shadow-2xl backdrop-blur-xl sm:gap-3 sm:p-3">
        <ChapterControl to={prev ? `/manga/${mangaSlug}/chapter/${prev.id}` : undefined} direction="prev" />

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold text-white">{current.name}</p>
          <p className="mt-0.5 text-xs text-neutral-400">Sedang dibaca</p>
        </div>

        <ChapterControl to={next ? `/manga/${mangaSlug}/chapter/${next.id}` : undefined} direction="next" />
        <button
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-neutral-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Tutup navigasi"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function ChapterControl({ to, direction }: { to?: string; direction: 'prev' | 'next' }) {
  const isPrev = direction === 'prev'
  const label = isPrev ? 'Sebelumnya' : 'Berikutnya'
  const icon = isPrev ? <ArrowLeftIcon className="h-4 w-4" /> : <ArrowRightIcon className="h-4 w-4" />
  const className = "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold transition sm:px-4"

  if (!to) {
    return <span className={`${className} cursor-not-allowed text-neutral-600`}>{isPrev ? <>{icon}<span className="hidden sm:inline">{label}</span></> : <><span className="hidden sm:inline">{label}</span>{icon}</>}</span>
  }

  return (
    <Link to={to} className={`${className} bg-white/5 text-neutral-100 hover:border-primary-500 hover:bg-primary-500 hover:text-white`}>
      {isPrev ? <>{icon}<span className="hidden sm:inline">{label}</span></> : <><span className="hidden sm:inline">{label}</span>{icon}</>}
    </Link>
  )
}

function EndNav({
  prev,
  next,
  mangaSlug,
}: {
  prev?: Chapter | null
  next?: Chapter | null
  mangaSlug: string
}) {
  return (
    <div className="mx-auto w-full max-w-200 px-4 pb-8 pt-6">
      <div className="mb-4 text-center text-sm text-neutral-500">
        — Akhir chapter —
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <NavBtn prev={prev} mangaSlug={mangaSlug} />
        <Link
          to={`/manga/${mangaSlug}`}
          className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-primary-500 hover:text-primary-500"
        >
          <BookIcon className="h-4 w-4" />
          Info Seri
        </Link>
        <NavBtn next={next} mangaSlug={mangaSlug} />
      </div>
    </div>
  )
}

function NavBtn({
  prev,
  next,
  mangaSlug,
}: {
  prev?: Chapter | null
  next?: Chapter | null
  mangaSlug: string
}) {
  const to = prev
    ? `/manga/${mangaSlug}/chapter/${prev.id}`
    : next
      ? `/manga/${mangaSlug}/chapter/${next.id}`
      : undefined
  const label = prev ? 'Prev' : next ? 'Next' : ''
  const icon = prev ? <ArrowLeftIcon className="h-4 w-4" /> : <ArrowRightIcon className="h-4 w-4" />
  const reversed = !!next

  if (!to) {
    return (
      <span className="flex w-24 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold opacity-40">
        {reversed ? <>{label}{icon}</> : <>{icon}{label}</>}
      </span>
    )
  }
  return (
    <Link
      to={to}
      className="flex w-24 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-primary-500 hover:text-primary-500"
    >
      {reversed ? <>{label}{icon}</> : <>{icon}{label}</>}
    </Link>
  )
}
