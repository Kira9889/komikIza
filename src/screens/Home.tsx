import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAnnouncements, fetchBanners, fetchHomeCollections } from '../api/library'
import type { Announcement, Banner, HomeCollections } from '../types'
import { queryKeys } from '../lib/queryKeys'
import MangaCard from '../components/manga/MangaCard'
import SectionTitle from '../components/ui/SectionTitle'
import FilterTabs from '../components/ui/FilterTabs'
import { ArrowLeftIcon, ArrowRightIcon, BookIcon, StarIcon } from '../icons'

export default function Home() {
  const { data } = useQuery({ queryKey: queryKeys.home, queryFn: fetchHomeCollections })
  const [recoTab, setRecoTab] = useState('manhwa')
  const [popTab, setPopTab] = useState('daily')
  const [updTab, setUpdTab] = useState('project')
  // Jam berjalan agar label waktu pengumuman selalu real-time.
  const [now, setNow] = useState(0)
  // Pengumuman hanya berasal dari backend agar yang sudah dihapus admin tidak muncul lagi.
  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: queryKeys.announcements,
    queryFn: async () => (await fetchAnnouncements()) ?? [],
  })
  // Banner sepenuhnya dikelola admin. Bila belum ada banner, hero tidak tampil.
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: queryKeys.banners,
    queryFn: async () => (await fetchBanners()) ?? [],
  })

  useEffect(() => {
    document.title = 'Tenshi.My.id — Digital Manga Library'
  }, [])

  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Slide hero murni dari banner buatan admin. Tidak ada fallback: bila admin
  // belum menambahkan banner, hero tidak dirender sama sekali.
  const slides = useMemo<HeroSlide[]>(
    () =>
      banners.map(b => ({
        key: b.id,
        title: b.title,
        image: b.image_url,
        mediaType: b.media_type,
        badge: b.manga_type ?? undefined,
        rating: b.manga_shinigami_rating || b.manga_rating || undefined,
        href: b.manga_slug ? `/manga/${b.manga_slug}` : undefined,
      })),
    [banners],
  )

  if (!data) return <HomeSkeleton />

  const reco = data.recommendation[recoTab as keyof HomeCollections['recommendation']]
  const pop = data.popular[popTab as keyof HomeCollections['popular']]

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Banner — hanya tampil bila admin sudah menambahkan banner. */}
      {slides.length > 0 && (
        <section className="mt-4 md:mt-8">
          <HeroCarousel items={slides} />
        </section>
      )}

      {/* Pengumuman */}
      {announcements.length > 0 && (
        <section className="mt-6">
          <AnnouncementCarousel announcements={announcements} now={now} />
        </section>
      )}

      {/* Rekomendasi */}
      <section className="mt-12">
        <SectionTitle action={{ label: 'Lihat semua', href: '/explore' }}>
          Rekomendasi
        </SectionTitle>
        <div className="mt-4">
          <FilterTabs
            tabs={[
              { value: 'manhwa', label: 'Manhwa' },
              { value: 'manga', label: 'Manga' },
              { value: 'manhua', label: 'Manhua' },
            ]}
            active={recoTab}
            onChange={setRecoTab}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {reco.map(m => (
            <MangaCard key={m.id} manga={m} />
          ))}
        </div>
      </section>

      {/* Update */}
      <section className="mt-12">
        <SectionTitle>Update</SectionTitle>
        <div className="mt-4">
          <FilterTabs
            tabs={[
              { value: 'project', label: 'Project' },
              { value: 'mirror', label: 'Mirror' },
            ]}
            active={updTab}
            onChange={setUpdTab}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data.updates.slice(0, 12).map(m => (
            <MangaCard key={m.id} manga={m} />
          ))}
        </div>
      </section>

      {/* Populer */}
      <section className="mt-12">
        <SectionTitle>Populer</SectionTitle>
        <div className="mt-4">
          <FilterTabs
            tabs={[
              { value: 'daily', label: 'Harian' },
              { value: 'weekly', label: 'Mingguan' },
              { value: 'all', label: 'Semua' },
            ]}
            active={popTab}
            onChange={setPopTab}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {pop.map(m => (
            <MangaCard key={m.id} manga={m} />
          ))}
        </div>
      </section>
    </div>
  )
}

function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} minggu lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Announcement({ title, time, body }: { title: string; time: string; body: string }) {
  return (
    <div className="rounded-lg border border-(--line) bg-(--card-2) p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-general-100">{title}</h3>
        <span className="text-[11px] text-general-400">{time}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-general-400">{body}</p>
    </div>
  )
}

// Satu slide hero dari banner yang dikelola admin.
interface HeroSlide {
  key: string
  title: string
  image: string
  mediaType: 'image' | 'video'
  badge?: string
  rating?: number
  href?: string
}

// Banner hero ala situs baca modern: background banner penuh + badge tipe &
// rating + judul + tombol baca + panah + indikator titik.
function HeroCarousel({ items }: { items: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const count = items.length

  useEffect(() => {
    if (paused || count < 2) return
    const t = setTimeout(() => setIndex(i => (i + 1) % count), 6000)
    return () => clearTimeout(t)
  }, [index, paused, count])

  if (!count) return null
  const active = index % count
  const s = items[active]

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative mb-8 overflow-hidden rounded-2xl bg-gray-900 shadow-2xl"
    >
      <div className="relative aspect-video max-h-105 min-h-50 w-full overflow-hidden sm:aspect-21/9 md:aspect-24/9">
        {items.map((item, i) => (
          <div
            key={item.key}
            aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${i === active ? 'opacity-100' : 'opacity-0'}`}
          >
            {!loaded[item.key] && (
              <div className="absolute inset-0 flex min-h-50 animate-pulse items-center justify-center bg-gray-800">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-primary-500" />
              </div>
            )}
            {item.mediaType === 'video' ? (
              <video
                src={item.image}
                autoPlay
                muted
                loop
                playsInline
                onLoadedData={() => setLoaded(p => ({ ...p, [item.key]: true }))}
                className={`h-full w-full object-cover object-center transition-all duration-700 ease-out hover:scale-105 ${loaded[item.key] ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : (
              <img
                src={item.image}
                alt={item.title}
                loading={i === 0 ? 'eager' : 'lazy'}
                onLoad={() => setLoaded(p => ({ ...p, [item.key]: true }))}
                className={`h-full w-full object-cover object-center transition-all duration-700 ease-out hover:scale-105 ${loaded[item.key] ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
          </div>
        ))}

        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-gray-950/70 via-gray-950/20 to-transparent" />

        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 sm:top-4 sm:left-4">
            {s.badge && (
              <span className="rounded-md bg-primary-500 px-2 py-0.5 text-[9px] font-black tracking-wider text-white uppercase shadow-md sm:px-2.5 sm:py-1 sm:text-xs">
                {s.badge}
              </span>
            )}
            {typeof s.rating === 'number' && s.rating > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary-400/25 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-primary-400 shadow-md backdrop-blur-md sm:px-2 sm:py-1 sm:text-xs">
                <StarIcon className="h-2.5 w-2.5 fill-primary-400 sm:h-3 sm:w-3" />
              <span>{s.rating.toFixed(1)}</span>
            </span>
            )}
        </div>

        <div className="absolute right-3 bottom-2.5 left-3 z-10 flex flex-col gap-1.5 sm:right-6 sm:bottom-6 sm:left-6 sm:gap-2.5">
          {s.href ? (
            <Link to={s.href}>
              <h2 className="line-clamp-2 max-w-2xl text-sm leading-tight font-extrabold tracking-wide text-white drop-shadow-lg sm:text-2xl md:text-3xl">
                {s.title}
              </h2>
            </Link>
          ) : (
            <h2 className="line-clamp-2 max-w-2xl text-sm leading-tight font-extrabold tracking-wide text-white drop-shadow-lg sm:text-2xl md:text-3xl">
              {s.title}
            </h2>
          )}
          {s.href && (
            <div className="flex items-center gap-2 pt-0.5">
              <Link
                to={s.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-md transition-all hover:bg-primary-600 active:scale-95 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <BookIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>READ NOW</span>
              </Link>
            </div>
          )}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((index - 1 + count) % count)}
              aria-label="Previous slide"
              className="absolute top-1/2 left-2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/80 sm:left-4 sm:h-10 sm:w-10"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((index + 1) % count)}
              aria-label="Next slide"
              className="absolute top-1/2 right-2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/80 sm:right-4 sm:h-10 sm:w-10"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="absolute right-4 bottom-2 z-20 flex items-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? 'w-6 bg-primary-500 shadow-[0_0_8px_#6f39ee]' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Carousel pengumuman horizontal: satu kartu per slide, bisa swipe/klik panah.
function AnnouncementCarousel({ announcements, now }: { announcements: Announcement[]; now: number }) {
  const [index, setIndex] = useState(0)
  const count = announcements.length

  if (count === 0) return null
  const a = announcements[index % count]

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {count > 1 && (
        <button
          type="button"
          onClick={() => setIndex((index - 1 + count) % count)}
          aria-label="Pengumuman sebelumnya"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--line) bg-(--card) text-general-400 shadow-md transition hover:bg-primary-500 hover:text-white sm:h-10 sm:w-10"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
      )}
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-(--line) bg-(--card) p-4 shadow-md">
        <div className="mb-3">
          <h2 className="font-display text-lg font-bold text-general-100">Pengumuman</h2>
        </div>
        <div className="min-h-20 transition-opacity duration-300">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-general-100">{a.title}</h3>
            <span className="shrink-0 text-[11px] text-general-400">{timeAgo(a.created_at, now)}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-general-400">{a.body}</p>
        </div>
        {count > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {announcements.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Pengumuman ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index % count ? 'w-6 bg-primary-500' : 'w-1.5 bg-general-500 hover:bg-general-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      {count > 1 && (
        <button
          type="button"
          onClick={() => setIndex((index + 1) % count)}
          aria-label="Pengumuman berikutnya"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--line) bg-(--card) text-general-400 shadow-md transition hover:bg-primary-500 hover:text-white sm:h-10 sm:w-10"
        >
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="animate-pulse aspect-square rounded-xl bg-(--card) lg:col-span-2 lg:aspect-16/5" />
        <div className="animate-pulse rounded-xl bg-(--card) p-4">
          <div className="h-5 w-32 rounded bg-(--card-2)" />
          <div className="mt-3 h-20 rounded bg-(--card-2)" />
        </div>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse aspect-3/4 rounded-lg bg-(--card)" />
        ))}
      </div>
    </div>
  )
}
