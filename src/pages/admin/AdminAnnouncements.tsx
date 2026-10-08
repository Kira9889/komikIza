import { useEffect, useState } from 'react'
import { fetchAnnouncements, saveAnnouncement, deleteAnnouncement } from '../../api/library'
import type { Announcement } from '../../types'
import { PlusIcon, TrashIcon, EditIcon } from '../../icons'

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([])
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = () => {
    fetchAnnouncements().then(setItems).catch(() => {})
  }

  useEffect(() => {
    reload()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setBody('')
    setError('')
  }

  const openEdit = (a: Announcement) => {
    setEditing(a)
    setTitle(a.title)
    setBody(a.body)
    setError('')
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await saveAnnouncement({ id: editing?.id, title: title.trim(), body: body.trim() })
      reload()
      openCreate()
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan pengumuman')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return
    await deleteAnnouncement(id)
    reload()
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Pengumuman</h1>
      <p className="mb-6 text-sm text-general-400">Tampil di sidebar Home. Yang paling baru di atas.</p>

      <form onSubmit={save} className="mb-6 max-w-xl space-y-3 rounded-xl border border-(--line) bg-(--card) p-4">
        <h2 className="text-sm font-bold text-general-200">{editing ? 'Edit Pengumuman' : 'Pengumuman Baru'}</h2>
        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Judul pengumuman"
          maxLength={120}
          className="input-manga"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Isi pengumuman…"
          rows={4}
          className="input-manga resize-y"
        />
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
        {items.map(a => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-(--line) bg-(--card) p-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-general-100">{a.title}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-general-400">{a.body}</div>
              <div className="mt-1 text-[11px] text-general-400">
                {new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => openEdit(a)} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-general-300 hover:border-primary-500 hover:text-primary-500">
                <EditIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => void remove(a.id)} aria-label="Hapus" className="grid h-8 w-8 place-items-center rounded-md border border-(--line) text-general-300 hover:border-red-500 hover:text-red-500">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-general-400">Belum ada pengumuman.</p>
        )}
      </div>
    </div>
  )
}
