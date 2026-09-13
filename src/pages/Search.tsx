import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchMangaList } from '../api/library'
import type { Manga } from '../types'
import MangaCard from '../components/manga/MangaCard'
import { SearchIcon } from '../icons'

const PAGE_SIZE = 30

function hasGenre(manga: Manga, genre: string) {
  return manga.genres.some(item => item.name === genre) || manga.tags.some(tag => tag === genre)
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [input, setInput] = useState(query)
  const [all, setAll] = useState<Manga[]>([])
  const [loading, setLoading] = useState(true)
  const [genreQuery, setGenreQuery] = useState('')
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [type, setType] = useState('semua')
  const [status, setStatus] = useState('semua')
  const [sort, setSort] = useState('latest')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    setLoading(true)
    fetchMangaList().then(items => {
      setAll(items)
      const names = new Set<string>()
      items.forEach(item => {
        item.genres.forEach(genre => names.add(genre.name))
        item.tags.forEach(tag => names.add(tag))
      })
      setAvailableGenres([...names].sort((a, b) => a.localeCompare(b)))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => setInput(query), [query])
  useEffect(() => setVisible(PAGE_SIZE), [query, selectedGenres, type, status, sort])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return all.filter(manga => {
      const text = [manga.title, manga.original_name, ...manga.alternative_names].filter(Boolean).join(' ').toLowerCase()
      return !normalizedQuery || text.includes(normalizedQuery)
    }).filter(manga => !selectedGenres.length || selectedGenres.some(genre => hasGenre(manga, genre)))
      .filter(manga => type === 'semua' || manga.type === type)
      .filter(manga => status === 'semua' || manga.status === status)
      .sort((a, b) => sort === 'popular' ? b.views_count - a.views_count : sort === 'title' ? a.title.localeCompare(b.title) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [all, query, selectedGenres, type, status, sort])

  const genreList = availableGenres.filter(genre => genre.toLowerCase().includes(genreQuery.toLowerCase()))
  const toggleGenre = (genre: string) => setSelectedGenres(current => current.includes(genre) ? current.filter(item => item !== genre) : [...current, genre])
  const submit = (event: React.FormEvent) => { event.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}) }

  return (
    <div className="mx-auto max-w-[1540px] px-4 py-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-400">Temukan bacaan baru</p><h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Cari Komik</h1></div>
        <span className="hidden text-sm text-general-400 sm:block">{all.length} judul tersedia</span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-(--line) bg-(--card) p-5 lg:sticky lg:top-22">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Genre</h2>{selectedGenres.length > 0 && <button onClick={() => setSelectedGenres([])} className="text-xs font-semibold text-primary-400 hover:text-primary-300">Reset</button>}</div>
          <div className="relative mt-4"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-general-400" /><input value={genreQuery} onChange={event => setGenreQuery(event.target.value)} placeholder="Cari genre" className="input-manga py-2.5! pl-9! text-sm" /></div>
          <div className="mt-4 flex max-h-58 flex-wrap content-start gap-2 overflow-y-auto pr-1">
            {genreList.map(genre => <button key={genre} onClick={() => toggleGenre(genre)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${selectedGenres.includes(genre) ? 'bg-primary-500 text-white' : 'bg-white/5 text-general-300 hover:bg-white/10 hover:text-white'}`}>{genre}</button>)}
          </div>
          <FilterGroup title="Tipe">{(['semua', 'manhwa', 'manga', 'manhua'] as const).map(value => <FilterOption key={value} value={value} active={type} onChange={setType} />)}</FilterGroup>
          <FilterGroup title="Status">{(['semua', 'Ongoing', 'Completed', 'Hiatus', 'Dropped'] as const).map(value => <FilterOption key={value} value={value} active={status} onChange={setStatus} />)}</FilterGroup>
        </aside>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form onSubmit={submit} className="relative flex-1"><SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-general-400" /><input value={input} onChange={event => setInput(event.target.value)} placeholder="Cari judul komik…" className="input-manga h-12 pl-12!" /></form>
            <select value={sort} onChange={event => setSort(event.target.value)} className="input-manga h-12 w-full sm:w-40"><option value="latest">Terbaru</option><option value="popular">Populer</option><option value="title">A–Z</option></select>
          </div>
          <div className="mt-5 flex items-center justify-between border-b border-(--line) pb-3"><p className="text-sm text-general-400">{query ? <>Hasil untuk <span className="font-semibold text-general-100">“{query}”</span></> : 'Semua komik'}</p><span className="text-sm font-semibold text-general-300">{filtered.length} judul</span></div>
          {loading ? <SearchSkeleton /> : filtered.length === 0 ? <div className="py-20 text-center text-general-400">Tidak ada judul yang sesuai dengan filter pencarian.</div> : <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{filtered.slice(0, visible).map(manga => <MangaCard key={manga.id} manga={manga} />)}</div>
            {visible < filtered.length && <div className="mt-8 text-center"><button onClick={() => setVisible(count => count + PAGE_SIZE)} className="btn-ghost rounded-xl px-5 py-2.5 text-sm font-semibold">Tampilkan lebih banyak</button></div>}
          </>}
        </section>
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-6 border-t border-(--line) pt-5"><h3 className="font-display text-base font-bold">{title}</h3><div className="mt-3 flex flex-wrap gap-2">{children}</div></div>
}

function FilterOption({ value, active, onChange }: { value: string; active: string; onChange: (value: string) => void }) {
  const label = value === 'semua' ? 'Semua' : value.charAt(0).toUpperCase() + value.slice(1)
  return <button onClick={() => onChange(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active === value ? 'bg-primary-500 text-white' : 'bg-white/5 text-general-300 hover:bg-white/10 hover:text-white'}`}>{label}</button>
}

function SearchSkeleton() {
  return <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 15 }).map((_, index) => <div key={index} className="animate-pulse aspect-3/4 rounded-xl bg-(--card)" />)}</div>
}
