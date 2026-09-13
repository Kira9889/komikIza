import { useEffect, useState } from 'react'
import { fetchMangaList } from '../api/library'
import { genres } from '../data/seed'
import type { Manga } from '../types'
import MangaCard from '../components/manga/MangaCard'
import FilterTabs from '../components/ui/FilterTabs'
import Pagination from '../components/ui/Pagination'

const PER_PAGE = 18

export default function Explore() {
  const [all, setAll] = useState<Manga[]>([])
  const [type, setType] = useState('semua')
  const [genre, setGenre] = useState('Semua')
  const [sort, setSort] = useState('views')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchMangaList({
      type: type === 'semua' ? undefined : type,
      genre: genre === 'Semua' ? undefined : genre,
    })
      .then(d => setAll(d))
      .finally(() => setLoading(false))
  }, [type, genre])

  const filtered = [...all].sort((a, b) => {
    if (sort === 'latest') return (b.latest_chapter?.release_timestamp ?? 0) - (a.latest_chapter?.release_timestamp ?? 0)
    if (sort === 'views') return b.views_count - a.views_count
    if (sort === 'follows') return b.follows_count - a.follows_count
    if (sort === 'rating') return b.rating - a.rating
    if (sort === 'latest-created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return 0
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => setPage(1), [type, genre, sort])

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 py-6">
        <h1 className="font-display text-2xl font-extrabold">Jelajahi</h1>
        <span className="text-sm text-general-400">{all.length} judul</span>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-general-400">
            Tipe
          </label>
          <FilterTabs
            tabs={[
              { value: 'semua', label: 'Semua' },
              { value: 'manhwa', label: 'Manhwa' },
              { value: 'manga', label: 'Manga' },
              { value: 'manhua', label: 'Manhua' },
            ]}
            active={type}
            onChange={setType}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-general-400">
            Genre
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGenre('Semua')}
              className={`chip ${genre === 'Semua' ? 'chip-active' : ''}`}
            >
              Semua
            </button>
            {genres.map(g => (
              <button
                key={g.id}
                onClick={() => setGenre(g.name)}
                className={`chip ${genre === g.name ? 'chip-active' : ''}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-y border-(--line) py-3">
          <span className="text-sm text-general-400">
            Menampilkan {filtered.length > 0 ? (page - 1) * PER_PAGE + 1 : 0}–
            {Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} judul
          </span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-general-400" htmlFor="sort">Urutkan</label>
            <select
              id="sort"
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="input-manga w-auto! py-2! text-sm"
            >
              <option value="latest">Terbaru</option>
              <option value="views">Populer</option>
              <option value="follows">Paling Diikuti</option>
              <option value="rating">Rating</option>
              <option value="latest-created">Baru Ditambahkan</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <div key={i} className="animate-pulse aspect-3/4 rounded-lg bg-(--card)" />
          ))}
        </div>
      ) : (
        <>
          {paged.length === 0 ? (
            <div className="mt-16 text-center text-general-400">Tidak ada judul ditemukan.</div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {paged.map(m => (
                <MangaCard key={m.id} manga={m} />
              ))}
            </div>
          )}
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}