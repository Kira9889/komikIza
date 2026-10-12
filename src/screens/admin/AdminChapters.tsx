import { useEffect, useState } from 'react'
import { fetchMangaList, fetchChapters, saveChapter, deleteChapter } from '../../api/library'
import type { Manga, Chapter, Screen } from '../../types'
import { PlusIcon, TrashIcon, EditIcon } from '../../icons'
import { toDrivePreview, toDriveImage } from '../../lib/drive'

export default function AdminChapters() {
  const [mangas, setMangas] = useState<Manga[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Chapter | null>(null)
  const [name, setName] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [pages, setPages] = useState<Screen[]>([])
  const [pageUrl, setPageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchMangaList().then(list => {
      setMangas(list)
      if (list.length) {
        setSelectedId(list[0].id)
        setSearch(list[0].title)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetchChapters(selectedId).then(setChapters)
  }, [selectedId])

  const selectManga = (id: string) => {
    setSelectedId(id)
    setChapters([])
  }

  const filteredMangas = mangas.filter(
    m => m.title.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const pickManga = (id: string) => {
    const m = mangas.find(x => x.id === id)
    if (m) setSearch(m.title)
    selectManga(id)
    setDropdownOpen(false)
  }

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || filteredMangas.length === 0) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setDropdownOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pickManga(filteredMangas[0].id)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setName(`Chapter ${chapters.length + 1}`)
    setPdfUrl('')
    setPages([])
    setPageUrl('')
    setFormError('')
    setOpen(true)
  }

  const addPage = () => {
    // Dukung tempel banyak URL sekaligus (1 baris = 1 gambar).
    const urls = pageUrl.split(/[\s\n]+/).map(u => u.trim()).filter(Boolean)
    if (!urls.length) return
    const base = Date.now()
    setPages(prev => [
      ...prev,
      ...urls.map((url, i) => ({ id: `pg-${base}-${prev.length + i}`, url: toDriveImage(url) })),
    ])
    setPageUrl('')
  }

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setFormError('')
    try {
      await saveChapter(selectedId, { id: editing?.id, name, pages, pdf_url: toDrivePreview(pdfUrl) })
      setChapters(await fetchChapters(selectedId))
      setOpen(false)
    } catch (e: any) {
      // Sebelumnya gagal disimpan diam-diam → user klik Simpan berulang → duplikat.
      setFormError(e?.message || 'Gagal menyimpan chapter')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    await deleteChapter(id)
    setChapters(await fetchChapters(selectedId))
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Chapter</h1>
          <p className="text-sm text-general-400">Kelola chapter & halaman untuk setiap buku.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" disabled={!selectedId}>
          <PlusIcon className="h-4 w-4" /> Tambah Chapter
        </button>
      </div>

      <div className="mb-5">
        <label className="mb-1 block text-sm font-medium text-general-300">Pilih Buku</label>
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setDropdownOpen(true) }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            onKeyDown={e => handleSearchKey(e)}
            placeholder="Ketik untuk mencari buku…"
            className="input-manga w-full"
          />
          {dropdownOpen && (
            <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-(--line) bg-(--bg) shadow-2xl">
              {filteredMangas.length === 0 ? (
                <div className="px-3 py-3 text-sm text-general-400">Tidak ada buku yang cocok.</div>
              ) : (
                filteredMangas.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); pickManga(m.id) }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-(--card-2) ${m.id === selectedId ? 'bg-(--card-2) text-primary-500' : 'text-general-100'}`}
                  >
                    <span className="truncate">{m.title}</span>
                    {m.id === selectedId && (
                      <span className="ml-auto shrink-0 text-xs text-primary-500">✓</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-(--line) bg-(--card)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--line) text-xs uppercase tracking-wide text-general-400">
              <th className="px-4 py-3">Chapter</th>
              <th className="px-4 py-3">Halaman</th>
              <th className="px-4 py-3">Rilis</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {chapters.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-general-400">Belum ada chapter.</td></tr>
            ) : (
              [...chapters].reverse().map(ch => (
                <tr key={ch.id} className="border-b border-(--line) last:border-0">
                  <td className="px-4 py-3 font-medium text-general-100">{ch.name}</td>
                  <td className="px-4 py-3 text-general-300">
                    {ch.pdf_url ? 'PDF' : `${ch.pages.length} halaman`}
                  </td>
                  <td className="px-4 py-3 text-general-400">
                    {new Date(ch.release_timestamp * 1000).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditing(ch); setName(ch.name); setPdfUrl(ch.pdf_url ?? ''); setPages([...ch.pages]); setPageUrl(''); setFormError(''); setOpen(true); }} className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-general-300 hover:border-primary-500 hover:text-primary-500" aria-label="Edit">
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(ch.id)} className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-red-400 hover:border-red-500" aria-label="Hapus">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-(--line) bg-(--bg) p-6">
            <h2 className="mb-1 font-display text-xl font-extrabold">
              {editing ? 'Edit Chapter' : 'Tambah Chapter'}
            </h2>
            <p className="mb-4 text-sm text-general-400">
              {mangas.find(m => m.id === selectedId)?.title ?? ''}
            </p>

            <label className="mb-1 block text-sm font-medium text-general-300">Nama Chapter</label>
            <input className="input-manga mb-4" value={name} onChange={e => setName(e.target.value)} />

            <div className="mb-4 rounded-lg border border-(--line) bg-(--card-2) p-3">
              <label className="block text-sm font-medium text-general-300">
                PDF (opsional, Google Drive)
              </label>
              <p className="mt-0.5 text-xs text-general-400">
                Tempel link Drive (…/file/&lt;id&gt;/view). Link &quot;/view&quot; otomatis diubah ke &quot;/preview&quot;.
                Pastikan file di-set &quot;Siapa pun yang memiliki link&quot; agar bisa tampil. Isi field ini maka
                chapter ditampilkan sebagai PDF, bukan daftar halaman.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={pdfUrl}
                  onChange={e => setPdfUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/…/view"
                  className="input-manga"
                />
                {pdfUrl.trim() && (
                  <a
                    href={toDrivePreview(pdfUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost shrink-0 rounded-lg px-3 text-sm font-semibold"
                  >
                    Pratinjau
                  </a>
                )}
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-general-300">Halaman (URL gambar)</label>
              <span className="text-xs text-general-400">{pages.length} halaman</span>
            </div>
            <p className="mb-2 text-xs text-general-400">
              Link Google Drive (…/file/&lt;id&gt;/view atau &lt;id&gt;/preview) otomatis dikonversi agar bisa tampil
              sebagai gambar. Link lainnya langsung dipakai apa adanya.
            </p>
            <div className="mb-3 flex gap-2">
              <textarea
                value={pageUrl}
                onChange={e => setPageUrl(e.target.value)}
                placeholder={'https://…/gambar-halaman.jpg\nTempel banyak URL sekaligus, 1 baris 1 gambar'}
                rows={3}
                className="input-manga"
              />
              <button onClick={addPage} className="btn-ghost shrink-0 self-start rounded-lg px-3 py-2 text-sm font-semibold">Tambah</button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pages.map((p, i) => (
                <div key={p.id} className="group relative aspect-3/4 overflow-hidden rounded-md border border-(--line)">
                  <img src={toDriveImage(p.url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white">{i + 1}</span>
                  <button
                    onClick={() => setPages(prev => prev.filter(x => x.id !== p.id))}
                    className="absolute right-1 top-1 hidden rounded bg-red-500 p-1 text-white group-hover:block"
                    aria-label="Hapus halaman"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {formError && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{formError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold">Batal</button>
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}