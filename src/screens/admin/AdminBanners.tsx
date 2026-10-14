import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchBanners, saveBanner, deleteBanner, fetchMangaList } from '../../api/library'
import type { Banner, BannerInput, Manga } from '../../types'
import { queryKeys } from '../../lib/queryKeys'
import { PlusIcon, TrashIcon, EditIcon } from '../../icons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const emptyForm: BannerInput = {
  title: '',
  image_url: '',
  media_type: 'image',
  manga_id: '',
  sort_order: 0,
}

export default function AdminBanners() {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<Banner[]>([])
  const [mangas, setMangas] = useState<Manga[]>([])
  const [editing, setEditing] = useState<Banner | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [form, setForm] = useState<BannerInput>(emptyForm)
  const [mangaSearch, setMangaSearch] = useState('')
  const [mangaOpen, setMangaOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = () => {
    fetchBanners().then(list => setItems(list ?? [])).catch(() => {})
    // Segarkan cache Home agar banner yang baru ditambah/dihapus langsung terlihat.
    void queryClient.invalidateQueries({ queryKey: queryKeys.banners })
  }

  useEffect(() => {
    reload()
    fetchMangaList().then(setMangas).catch(() => {})
  }, [])

  const set = (patch: Partial<BannerInput>) => setForm(f => ({ ...f, ...patch }))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setMangaSearch('')
    setError('')
  }

  const openEdit = (b: Banner) => {
    setEditing(b)
    setForm({
      title: b.title,
      image_url: b.image_url,
      media_type: b.media_type,
      manga_id: b.manga_id ?? '',
      sort_order: b.sort_order,
    })
    setMangaSearch(mangas.find(m => m.id === b.manga_id)?.title ?? '')
    setError('')
  }

  const filteredMangas = mangas.filter(m => m.title.toLowerCase().includes(mangaSearch.trim().toLowerCase()))

  const pickManga = (id: string) => {
    set({ manga_id: id })
    setMangaSearch(mangas.find(m => m.id === id)?.title ?? '')
    setMangaOpen(false)
  }

  const clearManga = () => {
    set({ manga_id: '' })
    setMangaSearch('')
    setMangaOpen(false)
  }

  const handleMangaKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mangaOpen || filteredMangas.length === 0) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setMangaOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pickManga(filteredMangas[0].id)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.image_url.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await saveBanner({ ...form, title: form.title.trim(), image_url: form.image_url.trim(), id: editing?.id })
      reload()
      openCreate()
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan banner')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!pendingDelete) return
    await deleteBanner(pendingDelete)
    setPendingDelete(null)
    reload()
  }

  return (
    <div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus banner?"
        message="Tidak bisa dibatalkan."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
      />

      <h1 className="mb-1 font-display text-2xl font-extrabold">Banner Home</h1>
      <p className="mb-6 text-sm text-general-400">
        Banner di halaman Home. Urutan kecil tampil lebih dulu. Isi URL gambar (termasuk GIF/WebP animasi) atau video,
        lalu tautkan ke judul agar tombol baca mengarah ke detailnya.
      </p>

      <form onSubmit={save} className="mb-6 max-w-xl space-y-3 rounded-xl border border-(--line) bg-(--card) p-4">
        <h2 className="text-sm font-bold text-general-200">{editing ? 'Edit Banner' : 'Banner Baru'}</h2>
        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}
        <input
          value={form.title}
          onChange={e => set({ title: e.target.value })}
          placeholder="Judul (opsional, untuk alt gambar)"
          maxLength={200}
          className="input-manga"
        />
        <input
          value={form.image_url}
          onChange={e => set({ image_url: e.target.value })}
          placeholder="URL gambar / video (https://…)"
          className="input-manga"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-general-300">Jenis media</span>
            <select
              value={form.media_type}
              onChange={e => set({ media_type: e.target.value as BannerInput['media_type'] })}
              className="input-manga"
            >
              <option value="image">Gambar (termasuk GIF/WebP)</option>
              <option value="video">Video (MP4/WebM)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-general-300">Urutan</span>
            <input
              type="number"
              min={0}
              value={form.sort_order}
              onChange={e => set({ sort_order: Number(e.target.value) || 0 })}
              className="input-manga"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-general-300">Tautkan ke judul (opsional)</span>
          <div className="relative">
            <input
              type="text"
              value={mangaSearch}
              onChange={e => {
                const text = e.target.value
                setMangaSearch(text)
                setMangaOpen(true)
                if (mangas.find(m => m.id === form.manga_id)?.title !== text) set({ manga_id: '' })
              }}
              onFocus={() => setMangaOpen(true)}
              onBlur={() => setTimeout(() => setMangaOpen(false), 150)}
              onKeyDown={handleMangaKey}
              placeholder="Ketik untuk mencari judul…"
              className="input-manga"
            />
            {mangaOpen && (
              <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-(--line) bg-(--bg) shadow-2xl">
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); clearManga() }}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-general-300 transition hover:bg-(--card-2)"
                >
                  — Tanpa tautan —
                </button>
                {filteredMangas.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-general-400">Tidak ada judul yang cocok.</div>
                ) : (
                  filteredMangas.slice(0, 50).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); pickManga(m.id) }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-(--card-2) ${m.id === form.manga_id ? 'bg-(--card-2) text-primary-500' : 'text-general-100'}`}
                    >
                      <span className="truncate">{m.title}</span>
                      {m.id === form.manga_id && <span className="ml-auto shrink-0 text-xs text-primary-500">✓</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <span className="mt-1 block text-xs text-general-400">
            Tombol baca hanya muncul bila banner ditautkan ke sebuah judul.
          </span>
        </label>
        <div className="flex gap-2">
          {editing && (
            <button type="button" onClick={openCreate} className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold">
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <PlusIcon className="h-4 w-4" /> {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </div>
      </form>

      <div className="max-w-xl space-y-2">
        {items.map(b => (
          <div key={b.id} className="flex items-start gap-3 rounded-lg border border-(--line) bg-(--card) p-3">
            <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md bg-(--card-2)">
              {b.media_type === 'video' ? (
                <video src={b.image_url} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={b.image_url} alt={b.title} loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-general-100">{b.title || '(tanpa judul)'}</div>
              <div className="mt-0.5 truncate text-xs text-general-400">
                {b.manga_slug ? `→ /manga/${b.manga_slug}` : 'tanpa tautan'}
              </div>
              <div className="mt-1 text-[11px] text-general-400">
                {b.media_type} · urutan {b.sort_order}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => openEdit(b)} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-general-300 hover:border-primary-500 hover:text-primary-500">
                <EditIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPendingDelete(b.id)} aria-label="Hapus" className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-general-300 hover:border-red-500 hover:text-red-500">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-general-400">Belum ada banner.</p>
        )}
      </div>
    </div>
  )
}
