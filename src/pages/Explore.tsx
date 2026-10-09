import { useEffect, useMemo, useState } from 'react'
import { fetchMangaList, listGenres } from '../api/library'
import { genres as seedGenres } from '../data/seed'
import type { Genre, Manga } from '../types'
import MangaCard from '../components/manga/MangaCard'
import MangaListCard from '../components/manga/MangaListCard'
import FilterTabs from '../components/ui/FilterTabs'
import Pagination from '../components/ui/Pagination'
import { FilterIcon, GridIcon, ListIcon } from '../icons'

const PER_PAGE = 18
const VIEW_KEY = 'tenshi_explore_view'

export default function Explore() {
  const [all, setAll] = useState<Manga[]>([])
  const [type, setType] = useState('semua')
  const [genre, setGenre] = useState('Semua')
  const [sort, setSort] = useState('views')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>(() =>
    localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid',
  )
  const [allGenres, setAllGenres] = useState<Genre[]>(seedGenres)

  useEffect(() => {
    listGenres()
      .then(list => {
        if (list.length) setAllGenres(list)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  const activeFilters = (type !== 'semua' ? 1 : 0) + (genre !== 'Semua' ? 1 : 0)

  const resetFilters = () => {
    setType('semua')
    setGenre('Semua')
    setSort('views')
  }

  const genreChips = useMemo(
    () => (
      <>
        <button
          onClick={() => setGenre('Semua')}
          className={`chip ${genre === 'Semua' ? 'chip-active' : ''}`}
        >
          Semua
        </button>
        {allGenres.map(g => (
          <button
            key={g.id}
            onClick={() => setGenre(g.name)}
            className={`chip ${genre === g.name ? 'chip-active' : ''}`}
          >
            {g.name}
          </button>
        ))}
      </>
    ),
    [allGenres, genre],
  )

  useEffect(() => {
    document.title = 'Jelajahi Komik — Tenshi.id'
  }, [])

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

      <div className="flex-col gap-5 hidden md:flex">
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

        <div className="hidden md:block">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-general-400">
            Genre
          </label>
          <div className="flex flex-wrap gap-2">{genreChips}</div>
        </div>

        <div className="flex items-center justify-between border-y border-(--line) py-3">
          <span className="text-sm text-general-400">
            Menampilkan {filtered.length > 0 ? (page - 1) * PER_PAGE + 1 : 0}–
            {Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} judul
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className="relative flex items-center gap-1.5 rounded-lg border border-(--line) bg-(--card) px-3 py-2 text-sm font-semibold text-general-200 transition hover:border-primary-500/50"
              aria-label="Buka filter"
            >
              <FilterIcon className="h-4 w-4 text-primary-500" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilters > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary-500 text-[11px] font-bold text-white">
                  {activeFilters}
                </span>
              )}
            </button>
            <div className="flex overflow-hidden rounded-lg border border-(--line)" role="group" aria-label="Tampilan">
              <button
                onClick={() => setView('grid')}
                aria-label="Tampilan grid"
                className={`grid h-9 w-9 place-items-center transition ${view === 'grid' ? 'bg-primary-500 text-white' : 'bg-(--card) text-general-400 hover:text-general-100'}`}
              >
                <GridIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                aria-label="Tampilan list"
                className={`grid h-9 w-9 place-items-center transition ${view === 'list' ? 'bg-primary-500 text-white' : 'bg-(--card) text-general-400 hover:text-general-100'}`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
            <label className="hidden text-xs text-general-400 sm:block" htmlFor="sort">Urutkan</label>
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
          ) : view === 'grid' ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {paged.map(m => (
                <MangaCard key={m.id} manga={m} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {paged.map(m => (
                <MangaListCard key={m.id} manga={m} />
              ))}
            </div>
          )}
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </>
      )}

      {/* Tombol filter melayang (mobile) */}
      <button
        onClick={() => setFilterOpen(true)}
        aria-label="Buka filter"
        className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#15151c] text-red-500 shadow-2xl ring-1 ring-white/10 transition hover:scale-105 md:hidden"
      >
        <FilterIcon className="h-6 w-6" />
        {activeFilters > 0 && (
          <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-primary-500 text-[11px] font-bold text-white">
            {activeFilters}
          </span>
        )}
      </button>

      {/* Popup filter */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setFilterOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Filter"
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-(--line) bg-(--card) p-5 sm:rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
                <FilterIcon className="h-5 w-5 text-primary-500" />
                Filter
              </h2>
              <button
                onClick={() => setFilterOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-general-400 hover:bg-white/10 hover:text-general-100"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-5">
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
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">{genreChips}</div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-general-400" htmlFor="sort-popup">
                  Urutkan
                </label>
                <select
                  id="sort-popup"
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="input-manga text-sm"
                >
                  <option value="latest">Terbaru</option>
                  <option value="views">Populer</option>
                  <option value="follows">Paling Diikuti</option>
                  <option value="rating">Rating</option>
                  <option value="latest-created">Baru Ditambahkan</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={resetFilters}
                className="btn-ghost flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                Reset
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="btn-primary flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                Lihat {filtered.length} Judul
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}