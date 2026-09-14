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

  useEffect(() => {
    fetchHomeCollections().then(setData).catch(console.error)
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
            className="relative block aspect-square overflow-hidden rounded-xl border border-(--line) bg-(--card) lg:col-span-2 lg:aspect-16/5"
          >
            <img
              src="https://placehold.co/1200x400/1a1a2e/6f39ee?text=Selamat+Datang+di+IzaLib"
              alt="Banner"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-r from-black/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10">
              <span className="mb-2 w-fit rounded bg-primary-500 px-2 py-0.5 text-xs font-bold uppercase text-white">
                Terbaru
              </span>
              <h1 className="max-w-md font-display text-2xl font-extrabold text-white md:text-4xl">
                Manga Library Digital Favoritmu
              </h1>
              <p className="mt-2 max-w-sm text-sm text-white/80">
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
              <Announcement title="Mode Baca Imersif" time="Baru saja"
                body="Navbar dan menu bawah kini otomatis sembunyi saat membaca chapter agar tidak menutupi tombol prev/next. Ketuk gambar untuk memunculkannya lagi. Daftar chapter juga bisa diurutkan Terbaru/Terlama." />
              <Announcement title="Koneksi Lebih Stabil" time="Hari ini"
                body="Indikator loading baru saat server aktif kembali dari mode tidur, tombol Coba lagi saat gagal memuat, plus penjaga otomatis tiap 4 menit agar database tidak tidur." />
              <Announcement title="Lebih Ringan & Cepat" time="Hari ini"
                body="Logo baru IzaLib yang ringan, halaman dimuat terpisah agar buka awal lebih cepat, daftar chapter dimuat ringkas, dan navigasi halaman Explore lebih simpel." />
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