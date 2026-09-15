import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchChapters, fetchMangaBySlug, fetchShinigamiPages } from '../api/library'
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
  const [manga, setManga] = useState<Manga | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [current, setCurrent] = useState<Chapter | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [readerControlsOpen, setReaderControlsOpen] = useState(false)

  // Chrome reader (header + navigasi + daftar chapter) disembunyikan
  // saat membaca, muncul lagi saat gambar diketuk.
  const toggleChrome = () => {
    const opening = !readerControlsOpen
    setReaderControlsOpen(opening)
    setMenuOpen(opening)
  }

  // Header overlay makin solid saat halaman digulir
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Muat manga + chapter; reset menu setiap kali slug/chapter berubah
  useEffect(() => {
    if (!slug) return
    setMenuOpen(false)
    setReaderControlsOpen(false)
    // Setiap ganti chapter selalu mulai membaca dari halaman paling atas.
    window.scrollTo(0, 0)
    fetchMangaBySlug(slug).then(async m => {
      if (!m) return
      setManga(m)
      const ch = await fetchChapters(m.id, { slim: true })
      setChapters(ch)
      const selected = ch.find(c => c.id === chapterId) ?? null
      // Pages diambil terpisah hanya bila daftar tidak membawanya
      // (mode slim online). Mode offline/mock membawa pages langsung.
      if (selected && !selected.pdf_url && selected.pages.length === 0) {
        selected.pages = await fetchShinigamiPages(selected.id)
      }
      setCurrent(selected)
    })
  }, [slug, chapterId])

  if (!manga || !current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-general-400">
        Memuat chapter…
      </div>
    )
  }

  const idx = chapters.findIndex(c => c.id === current.id)
  const prev = idx > 0 ? chapters[idx - 1] : null
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0d] text-white">
      {/* Navbar sticky transparan di atas konten baca (geser hilang saat chrome disembunyikan) */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          readerControlsOpen ? 'translate-y-0' : '-translate-y-full'
        } ${
          scrolled
            ? 'border-b border-white/10 bg-[#0b0b0d]/95 backdrop-blur-md'
            : 'border-b border-transparent bg-linear-to-b from-black/70 to-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
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
            {!current.pdf_url && (
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

        {/* Daftar chapter (panel hamburger) */}
        {menuOpen && (
          <div className="mx-auto flex max-w-5xl px-4 pt-2 pb-2">
            <div className="max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#141416]/95 p-2 shadow-2xl backdrop-blur-md">
              {chapters.map(ch => {
                const active = ch.id === current.id
                return (
                  <Link
                    key={ch.id}
                    to={`/manga/${manga.slug}/chapter/${ch.id}`}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-primary-500/15 font-semibold text-primary-400'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-neutral-100'
                    }`}
                  >
                    {ch.name}
                    {active && (
                      <span className="rounded bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-bold text-primary-300">
                        Sedang dibaca
                      </span>
                    )}
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
    const u = new URL(src, window.location.origin)
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
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5" role="dialog" aria-label="Navigasi chapter">
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
