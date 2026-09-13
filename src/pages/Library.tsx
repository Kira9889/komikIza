import { useEffect, useState } from 'react'
import { seedManga } from '../data/seed'
import { fetchMangaList } from '../api/library'
import { isBackendOnline } from '../lib/api'
import { useLibrary } from '../context/LibraryContext'
import MangaCard from '../components/manga/MangaCard'
import { LibraryIcon } from '../icons'

export default function Library() {
  const { likedIds } = useLibrary()
  const [mangas, setMangas] = useState(() => seedManga)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const online = await isBackendOnline()
      // saat backend online, ambil data manga sungguhan dari database
      if (online) {
        const list = await fetchMangaList()
        if (!cancelled) setMangas(list)
        return
      }
      if (!cancelled) setMangas(seedManga)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const likedMangas = mangas.filter(m => likedIds.includes(m.id))

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex items-center gap-3 py-6">
        <LibraryIcon className="h-7 w-7 text-primary-500" />
        <div>
          <h1 className="font-display text-2xl font-extrabold">Library</h1>
          <p className="text-sm text-general-400">{likedMangas.length} judul diikuti</p>
        </div>
      </div>

      {likedMangas.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-general-400">
          <LibraryIcon className="h-16 w-16 opacity-40" />
          <p className="text-lg font-semibold text-general-300">Library kamu masih kosong</p>
          <p>
            Tekan ikon di halaman detail untuk menambahkan komik ke library favoritmu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {likedMangas.map(m => (
            <MangaCard key={m.id} manga={m} />
          ))}
        </div>
      )}
    </div>
  )
}