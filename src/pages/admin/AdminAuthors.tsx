import { useEffect, useState } from 'react'
import { listAuthors, createAuthor, deleteAuthor } from '../../api/library'
import type { Author } from '../../types'
import { PlusIcon, TrashIcon } from '../../icons'

export default function AdminAuthors() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState<'author' | 'artist'>('author')

  useEffect(() => {
    listAuthors().then(setAuthors)
  }, [])

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await createAuthor(trimmed, role)
    setAuthors(await listAuthors())
    setName('')
  }

  const remove = async (id: string) => {
    await deleteAuthor(id)
    setAuthors(await listAuthors())
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Pengarang</h1>
      <p className="mb-6 text-sm text-general-400">Daftar pengarang & artist.</p>

      <div className="mb-6 flex max-w-md flex-col gap-2 sm:flex-row">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Nama pengarang" className="input-manga" />
        <select value={role} onChange={e => setRole(e.target.value as 'author' | 'artist')} className="input-manga w-auto!">
          <option value="author">Author</option>
          <option value="artist">Artist</option>
        </select>
        <button onClick={add} className="btn-primary flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold">
          <PlusIcon className="h-4 w-4" /> Tambah
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-(--line) bg-(--card)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--line) text-xs uppercase tracking-wide text-general-400">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Peran</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {authors.map(a => (
              <tr key={a.id} className="border-b border-(--line) last:border-0">
                <td className="px-4 py-3 font-medium text-general-100">{a.name}</td>
                <td className="px-4 py-3 capitalize text-general-300">{a.role}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(a.id)} className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-red-400 transition hover:border-red-500" aria-label="Hapus">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}