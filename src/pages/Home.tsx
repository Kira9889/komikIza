import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomeCollections } from '../api/library'
import type { HomeCollections, Manga } from '../types'
import MangaCard from '../components/manga/MangaCard'
import SectionTitle from '../components/ui/SectionTitle'
import FilterTabs from '../components/ui/FilterTabs'

export default function Home() {
  const [data, setData] = useState<HomeCollections | null>(null)
  const [recoTab, setRecoTab] = useState('manhwa')
  const [popTab, setPopTab] = useState('daily')
  const [updTab, setUpdTab] = useState('project')
  // Jam berjalan agar label waktu pengumuman selalu real-time.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    fetchHomeCollections().then(setData).catch(console.error)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Slide hero: judul yang baru update + punya cover. (Hook harus di atas
  // early-return agar jumlah hook konsisten tiap render.)
  const hero = useMemo(() => (data?.updates ?? []).filter(m => m.cover_url).slice(0, 6), [data])

  if (!data) return <HomeSkeleton />

  const reco = data.recommendation[recoTab as keyof HomeCollections['recommendation']]
  const pop = data.popular[popTab as keyof HomeCollections['popular']]

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Banner */}
      <section className="mt-4 md:mt-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HeroCarousel items={hero} />

          <aside className="rounded-xl border border-(--line) bg-(--card) p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-general-100">Pengumuman</h2>
              <Link to="#" className="text-sm text-general-400 hover:text-primary-500">Semua</Link>
            </div>
            <div className="space-y-3">
              {ANNOUNCEMENTS.map(a => (
                <Announcement
                  key={a.title}
                  title={a.title}
                  time={timeAgo(a.date, now)}
                  body={a.body}
                />
              ))}
            </div>
          </aside>
        </div>
      </section>

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
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
          {pop.map(m => (
            <MangaCard key={m.id} manga={m} />
          ))}
        </div>
      </section>
    </div>
  )
}

// Waktu terbit asli (WIB) tiap pengumuman — label relatif dihitung real-time.
const ANNOUNCEMENTS: { title: string; date: string; body: string }[] = [
  {
    title: 'Mode Baca Imersif',
    date: '2026-09-14T22:47:35+07:00',
    body: 'Navbar dan menu bawah kini otomatis sembunyi saat membaca chapter agar tidak menutupi tombol prev/next. Ketuk gambar untuk memunculkannya lagi. Daftar chapter juga bisa diurutkan Terbaru/Terlama.',
  },
  {
    title: 'Koneksi Lebih Stabil',
    date: '2026-09-14T23:27:03+07:00',
    body: 'Indikator loading baru saat server aktif kembali dari mode tidur, tombol Coba lagi saat gagal memuat, plus penjaga otomatis tiap 4 menit agar database tidak tidur.',
  },
  {
    title: 'Lebih Ringan & Cepat',
    date: '2026-09-14T23:35:57+07:00',
    body: 'Logo baru Tenshi.id yang ringan, halaman dimuat terpisah agar buka awal lebih cepat, daftar chapter dimuat ringkas, dan navigasi halaman Explore lebih simpel.',
  },
]

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

// Badge "CHAPTER 71" dari nomor chapter terbaru (fallback: nama chapter).
function heroBadge(m: Manga): string {
  if (m.latest_chapter_number && m.latest_chapter_number > 0) return `Chapter ${m.latest_chapter_number}`
  const name = m.latest_chapter?.name ?? ''
  const hit = name.match(/chapter\s*([\d.]+)/i)
  if (hit) return `Chapter ${hit[1]}`
  return 'Update'
}

// Hero carousel ala situs baca modern: background blur + badge chapter +
// cover + judul + genre + sinopsis + panah + strip thumbnail.
function HeroCarousel({ items }: { items: Manga[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = items.length

  useEffect(() => {
    if (paused || count < 2) return
    const t = setTimeout(() => setIndex(i => (i + 1) % count), 6000)
    return () => clearTimeout(t)
  }, [index, paused, count])

  if (!count) return null
  const m = items[index % count]
  const genres = (m.genres ?? []).slice(0, 4).map(g => (typeof g === 'string' ? g : g.name))

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative flex min-h-80 overflow-hidden rounded-xl border border-(--line) bg-[#0b0b0d] sm:min-h-96 lg:col-span-2"
    >
      {/* Background blur per slide */}
      {items.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== index % count}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index % count ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={s.banner_url || s.cover_url}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className="h-full w-full scale-110 object-cover opacity-50 blur-2xl"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/60 to-black/30" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/90 to-transparent" />
        </div>
      ))}

      {/* Konten */}
      <div className="relative flex w-full items-center gap-4 p-4 pb-16 sm:gap-6 sm:p-6 sm:pb-16 md:p-8 md:pb-16">
        <Link to={`/manga/${m.slug}`} className="w-28 shrink-0 sm:w-40 md:w-48">
          <img
            src={m.cover_url}
            alt={m.title}
            className="aspect-[3/4] w-full rounded-lg object-cover shadow-2xl ring-1 ring-white/20"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-primary-500 px-3 py-1 text-[11px] font-extrabold tracking-wide text-white uppercase sm:text-xs">
            {heroBadge(m)}
          </span>
          <Link to={`/manga/${m.slug}`}>
            <h2 className="mt-2 line-clamp-2 font-display text-xl leading-tight font-extrabold text-white sm:text-2xl md:text-4xl">
              {m.title}
            </h2>
          </Link>
          {genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
              {genres.map(g => (
                <span
                  key={g}
                  className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-200 sm:px-3 sm:py-1 sm:text-xs"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          {m.description && (
            <p className="mt-2 line-clamp-2 max-w-xl text-xs leading-relaxed text-white/80 sm:mt-3 sm:line-clamp-3 sm:text-sm">
              {m.description}
            </p>
          )}
          <Link
            to={`/manga/${m.slug}`}
            className="mt-3 inline-block rounded-lg bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-600 sm:mt-4 sm:text-sm"
          >
            Baca Sekarang
          </Link>
        </div>
      </div>

      {/* Panah */}
      {count > 1 && (
        <>
          <button
            onClick={() => setIndex((index - 1 + count) % count)}
            aria-label="Sebelumnya"
            className="absolute top-1/2 left-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-lg text-white backdrop-blur transition hover:bg-primary-500"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex((index + 1) % count)}
            aria-label="Berikutnya"
            className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-lg text-white backdrop-blur transition hover:bg-primary-500"
          >
            ›
          </button>
        </>
      )}

      {/* Strip thumbnail */}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 flex max-w-full -translate-x-1/2 gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur">
          {items.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndex(i)}
              aria-label={s.title}
              className={`h-12 w-9 shrink-0 overflow-hidden rounded-md transition sm:h-14 sm:w-11 ${
                i === index % count ? 'ring-2 ring-primary-500' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img src={s.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
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
          <div key={i} className="animate-pulse aspect-[3/4] rounded-lg bg-(--card)" />
        ))}
      </div>
    </div>
  )
}