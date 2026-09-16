import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomeCollections } from '../api/library'
import type { HomeCollections } from '../types'
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

  if (!data) return <HomeSkeleton />

  const reco = data.recommendation[recoTab as keyof HomeCollections['recommendation']]
  const pop = data.popular[popTab as keyof HomeCollections['popular']]

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Banner */}
      <section className="mt-4 md:mt-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <a
            href="#"
            className="relative block aspect-16/10 overflow-hidden rounded-xl border border-(--line) bg-(--card) sm:aspect-16/7 lg:col-span-2 lg:aspect-16/5"
          >
            <img
              src="https://placehold.co/1200x400/1a1a2e/6f39ee?text=Selamat+Datang+di+Tenshi.id"
              alt="Banner"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-r from-black/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-5 sm:p-6 md:p-10">
              <span className="mb-1.5 w-fit rounded bg-primary-500 px-2 py-0.5 text-[11px] font-bold uppercase text-white sm:mb-2 sm:text-xs">
                Terbaru
              </span>
              <h1 className="max-w-md font-display text-xl font-extrabold leading-tight text-white sm:text-2xl md:text-4xl">
                Manga Library Digital Favoritmu
              </h1>
              <p className="mt-1.5 line-clamp-2 max-w-sm text-xs leading-relaxed text-white/80 sm:mt-2 sm:text-sm">
                Baca manhwa, manga, dan manhua favorit secara gratis. Update setiap hari.
              </p>
            </div>
          </a>

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