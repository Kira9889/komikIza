import { useEffect, useState } from 'react'
import { listGenres, createGenre, deleteGenre } from '../../api/library'
import type { Genre } from '../../types'
import { PlusIcon, TrashIcon } from '../../icons'

export default function AdminGenres() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [name, setName] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    listGenres().then(setGenres)
  }, [])

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await createGenre(trimmed)
    setGenres(await listGenres())
    setName('')
    setNotice('')
  }

  const remove = async (id: string, gname: string) => {
    if (genres.length <= 1) {
      setNotice('Minimal harus ada satu genre')
      return
    }
    await deleteGenre(id)
    setGenres(await listGenres())
    void gname
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Genre</h1>
      <p className="mb-6 text-sm text-general-400">Genre yang bisa dipakai untuk mengkategorikan buku.</p>

      {notice && <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">{notice}</div>}

      <div className="mb-6 flex max-w-sm gap-2">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Nama genre baru" className="input-manga" />
        <button onClick={add} className="btn-primary flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold">
          <PlusIcon className="h-4 w-4" /> Tambah
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {genres.map(g => (
          <span key={g.id} className="chip">
            {g.name}
            <button onClick={() => remove(g.id, g.name)} className="text-red-400 hover:text-red-500" aria-label="Hapus">
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}