import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAnnouncements, fetchBanners, fetchHomeCollections } from '../api/library'
import type { Announcement, Banner, HomeCollections } from '../types'
import { queryKeys } from '../lib/queryKeys'
import MangaCard from '../components/manga/MangaCard'
import AnnouncementCard from '../components/announcement/AnnouncementCard'
import SectionTitle from '../components/ui/SectionTitle'
import FilterTabs from '../components/ui/FilterTabs'
import { ArrowLeftIcon, ArrowRightIcon, BookIcon, StarIcon } from '../icons'

export default function Home() {
  const { data } = useQuery({ queryKey: queryKeys.home, queryFn: fetchHomeCollections })
  const [recoTab, setRecoTab] = useState('manhwa')
  const [popTab, setPopTab] = useState('daily')
  const [updTab, setUpdTab] = useState('project')
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
          <AnnouncementCarousel announcements={announcements} />
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
        {/* Hanya slide yang aktif dimount: video banner yang tidak aktif
            tidak lagi diunduh/autoplay secara paralel (hemat egress besar). */}
        <div
          key={s.key}
          aria-hidden={false}
          className="absolute inset-0 transition-opacity duration-500 ease-in-out"
        >
          {!loaded[s.key] && (
            <div className="absolute inset-0 flex min-h-50 animate-pulse items-center justify-center bg-gray-800">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-primary-500" />
            </div>
          )}
          {s.mediaType === 'video' ? (
            <video
              src={s.image}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              onLoadedData={() => setLoaded(p => ({ ...p, [s.key]: true }))}
              className={`h-full w-full object-cover object-center transition-all duration-700 ease-out hover:scale-105 ${loaded[s.key] ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <img
              src={s.image}
              alt={s.title}
              loading={active === 0 ? 'eager' : 'lazy'}
              onLoad={() => setLoaded(p => ({ ...p, [s.key]: true }))}
              className={`h-full w-full object-cover object-center transition-all duration-700 ease-out hover:scale-105 ${loaded[s.key] ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
        </div>

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

// Carousel pengumuman: dua kartu per slide, header + tombol panah + indikator.
function AnnouncementCarousel({ announcements }: { announcements: Announcement[] }) {
  const [index, setIndex] = useState(0)
  const perSlide = 2
  const pages = Math.max(1, Math.ceil(announcements.length / perSlide))
  const active = Math.min(index, pages - 1)
  const slides: Announcement[][] = []
  for (let i = 0; i < announcements.length; i += perSlide) {
    slides.push(announcements.slice(i, i + perSlide))
  }

  if (announcements.length === 0) return null

  const go = (dir: -1 | 1) => setIndex(i => (i + dir + pages) % pages)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-xl font-semibold text-general-100 md:text-2xl">Pengumuman</h2>
        <Link to="/announcement" className="text-base text-general-300 transition-colors hover:text-primary-500 md:text-lg">
          Semua
        </Link>
      </div>

      <div className="relative w-full overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((group, si) => (
            <div
              key={si}
              aria-hidden={si !== active}
              className="flex w-full shrink-0 flex-col gap-4"
            >
              {group.map(a => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={active === 0}
            aria-label="Pengumuman sebelumnya"
            className="flex h-9 w-9 items-center justify-center rounded-md bg-(--card) text-general-100 transition-opacity disabled:opacity-40"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Pengumuman halaman ${i + 1}`}
                className={`grid h-4 w-4 place-items-center rounded-full border transition-colors ${
                  i === active ? 'border-primary-400' : 'border-transparent'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${i === active ? 'bg-primary-500' : 'bg-general-200'}`} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={active === pages - 1}
            aria-label="Pengumuman berikutnya"
            className="flex h-9 w-9 items-center justify-center rounded-md bg-(--card) text-general-100 transition-opacity disabled:opacity-40"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
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
