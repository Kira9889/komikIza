import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMangaList, saveManga, removeManga, importShinigamiCatalog } from '../../api/library'
import type { Manga, MangaInput, MangaType, MangaStatus } from '../../types'
import { PlusIcon, EditIcon, TrashIcon } from '../../icons'

const emptyForm: MangaInput = {
  title: '',
  slug: '',
  original_name: '',
  type: 'manhwa',
  status: 'Ongoing',
  description: '',
  cover_url: '',
  banner_url: '',
  shinigami_id: '',
  alternative_names: [],
  release_date: '',
  tags: [],
  genreNames: [],
  authorNames: [],
}

function splitLines(s: string) {
  return s
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
}

export default function AdminManga() {
  const [mangas, setMangas] = useState<Manga[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<Manga | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<MangaInput>(emptyForm)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)

  const reload = () => {
    fetchMangaList().then(list => {
      setMangas(list)
      setLoaded(true)
    })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(
    () =>
      mangas.filter(m => {
        const q = query.toLowerCase()
        if (!q) return true
        return (
          m.title.toLowerCase().includes(q) ||
          m.original_name?.toLowerCase().includes(q) ||
          m.alternative_names.some(n => n.toLowerCase().includes(q))
        )
      }),
    [mangas, query],
  )

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (m: Manga) => {
    setEditing(m)
    setForm({
      title: m.title,
      slug: m.slug,
      original_name: m.original_name ?? '',
      type: m.type,
      status: m.status,
      description: m.description,
      cover_url: m.cover_url,
      banner_url: m.banner_url ?? '',
      shinigami_id: m.shinigami_id ?? '',
      alternative_names: m.alternative_names,
      release_date: m.release_date,
      tags: m.tags,
      genreNames: m.genres.map(g => g.name),
      authorNames: m.authors.map(a => a.name),
    })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setNotice('Judul wajib diisi')
      return
    }
    await saveManga(form, editing?.id)
    setNotice(editing ? 'Buku berhasil diperbarui' : 'Buku berhasil ditambahkan')
    setOpen(false)
    reload()
  }

  const remove = async (m: Manga) => {
    if (!confirm(`Hapus "${m.title}"?`)) return
    await removeManga(m.id)
    setNotice('Buku dihapus')
    reload()
  }

  const set = (patch: Partial<MangaInput>) => setForm(prev => ({ ...prev, ...patch }))

  const importCatalog = async () => {
    if (!confirm('Impor seluruh katalog Shinigami? Judul yang sama akan dihubungkan ke sumber chapter otomatis.')) return
    setImporting(true)
    setNotice('Mengimpor katalog Shinigami…')
    try {
      const result = await importShinigamiCatalog()
      setNotice(`${result.imported} judul disinkronkan (${result.linked} judul lokal dihubungkan).`)
      reload()
    } catch (e: any) {
      setNotice(`Impor gagal: ${e.message || 'coba lagi'}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Buku (Manga)</h1>
          <p className="text-sm text-general-400">Kelola judul, judul alternatif, pengarang, tipe, chapter, tag, dan genre.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={importCatalog} disabled={importing} className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {importing ? 'Mengimpor…' : 'Impor Shinigami'}
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
            <PlusIcon className="h-4 w-4" />
            Tambah Buku
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
          {notice}
          <button onClick={() => setNotice('')} className="text-xs opacity-70">tutup</button>
        </div>
      )}

      <div className="mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari judul / nama alternatif…"
          className="input-manga max-w-sm"
        />
      </div>

      {!loaded ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg bg-(--card)" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-(--line) bg-(--card)">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b border-(--line) text-xs uppercase tracking-wide text-general-400">
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Genre</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-general-400">
                    Tidak ada buku ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className="border-b border-(--line) last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={m.cover_url} alt="" className="h-12 w-9 rounded object-cover" />
                        <div>
                          <Link to={`/manga/${m.slug}`} className="font-semibold text-general-100 hover:text-primary-500">
                            {m.title}
                          </Link>
                          <div className="text-xs text-general-400">
                            {m.original_name || m.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-general-300">{m.type}</td>
                    <td className="px-4 py-3 text-general-300">{m.genres.map(g => g.name).join(', ') || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${m.status === 'Ongoing' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-general-500/15 text-general-400'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(m)} className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-general-300 transition hover:border-primary-500 hover:text-primary-500" aria-label="Edit">
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(m)} className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-red-400 transition hover:border-red-500" aria-label="Hapus">
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
      )}

      {open && (
        <MangaForm
          editing={editing}
          form={form}
          set={set}
          onClose={() => setOpen(false)}
          onSave={save}
        />
      )}
    </div>
  )
}

function MangaForm({
  editing,
  form,
  set,
  onClose,
  onSave,
}: {
  editing: Manga | null
  form: MangaInput
  set: (patch: Partial<MangaInput>) => void
  onClose: () => void
  onSave: (e: React.FormEvent) => void
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-(--line) bg-(--bg) p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">
            {editing ? 'Edit Buku' : 'Tambah Buku'}
          </h2>
          <button onClick={onClose} className="rounded-md px-2 text-general-400 hover:text-general-100">✕</button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <Field label="Judul *">
            <input className="input-manga" value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Judul utama" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Slug (opsional)">
              <input className="input-manga" value={form.slug} onChange={e => set({ slug: e.target.value })} placeholder="auto dari judul" />
            </Field>
            <Field label="Nama Asli (opsional)">
              <input className="input-manga" value={form.original_name ?? ''} onChange={e => set({ original_name: e.target.value })} placeholder="contoh: 나 혼자만 레벨업" />
            </Field>
          </div>

          <Field label="ID Shinigami (opsional — chapter otomatis)">
            <input
              className="input-manga"
              value={form.shinigami_id ?? ''}
              onChange={e => set({ shinigami_id: e.target.value.trim() })}
              placeholder="UUID dari URL /series/{id}"
            />
            <p className="mt-1 text-xs text-general-400">Jika diisi, chapter dan halaman selalu mengikuti sumber secara live.</p>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipe Komik *">
              <select className="input-manga" value={form.type} onChange={e => set({ type: e.target.value as MangaType })}>
                <option value="manhwa">Manhwa (Korea)</option>
                <option value="manga">Manga (Jepang)</option>
                <option value="manhua">Manhua (Cina)</option>
              </select>
            </Field>
            <Field label="Status">
              <select className="input-manga" value={form.status} onChange={e => set({ status: e.target.value as MangaStatus })}>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Hiatus">Hiatus</option>
                <option value="Dropped">Dropped</option>
              </select>
            </Field>
          </div>

          <Field label="Sinopsis / Deskripsi *">
            <textarea className="input-manga min-h-24 resize-y" value={form.description} onChange={e => set({ description: e.target.value })} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="URL Cover">
              <input className="input-manga" value={form.cover_url} onChange={e => set({ cover_url: e.target.value })} placeholder="https://…" />
            </Field>
            <Field label="URL Banner (opsional)">
              <input className="input-manga" value={form.banner_url ?? ''} onChange={e => set({ banner_url: e.target.value })} placeholder="https://…" />
            </Field>
          </div>

          <Field label="Judul Alternatif (pisahkan dengan koma)">
            <input className="input-manga" value={form.alternative_names.join(', ')} onChange={e => set({ alternative_names: splitLines(e.target.value) })} placeholder="Judul lain, Nama lain" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pengarang (koma)">
              <input className="input-manga" value={form.authorNames.join(', ')} onChange={e => set({ authorNames: splitLines(e.target.value) })} placeholder="Nama pengarang, artist" />
            </Field>
            <Field label="Genre (koma)">
              <input className="input-manga" value={form.genreNames.join(', ')} onChange={e => set({ genreNames: splitLines(e.target.value) })} placeholder="Action, Fantasy" />
            </Field>
          </div>

          <Field label="Tag (koma)">
            <input className="input-manga" value={form.tags.join(', ')} onChange={e => set({ tags: splitLines(e.target.value) })} placeholder="OP MC, Isekai" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tanggal Rilis">
              <input type="date" className="input-manga" value={form.release_date} onChange={e => set({ release_date: e.target.value })} />
            </Field>
          </div>

          <div className="pt-2 text-xs text-general-400">
            Genre & pengarang yang belum ada akan otomatis dibuat saat menyimpan.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold">
              Batal
            </button>
            <button type="submit" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">
              {editing ? 'Simpan Perubahan' : 'Tambah Buku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-general-300">{label}</label>
      {children}
    </div>
  )
}
