import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllComments, deleteComment } from '../../api/library'
import type { AdminComment } from '../../types'
import { TrashIcon } from '../../icons'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminComments() {
  const [items, setItems] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<AdminComment | null>(null)

  const reload = () => {
    setLoading(true)
    fetchAllComments()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(c =>
      c.body.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      c.manga_title.toLowerCase().includes(q) ||
      (c.chapter_name ?? '').toLowerCase().includes(q),
    )
  }, [items, query])

  const remove = async () => {
    if (!pendingDelete) return
    await deleteComment(pendingDelete.id)
    setItems(prev => prev.filter(c => c.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Komentar User</h1>
      <p className="mb-6 text-sm text-general-400">
        Semua komentar ({items.length}) — dari buku & chapter apa, oleh siapa.
      </p>

      <div className="mb-4 max-w-md">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari isi, user, buku, chapter…"
          className="input-manga"
        />
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus komentar?"
        message={pendingDelete ? `Dari ${pendingDelete.username} di ${pendingDelete.manga_title}. Tidak bisa dibatalkan.` : undefined}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void remove()}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-general-400">Memuat…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-general-400">Belum ada komentar.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="rounded-lg border border-(--line) bg-(--card) p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span className="font-semibold text-general-100">{c.username}</span>
                  <span className="text-general-400">
                    {new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={() => setPendingDelete(c)}
                  aria-label="Hapus komentar"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-(--line) text-general-400 transition hover:border-red-500 hover:text-red-500"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
                <span className="text-general-400">di</span>
                <Link to={`/manga/${c.manga_slug}`} className="font-medium text-primary-500 hover:underline">
                  {c.manga_title}
                </Link>
                {c.chapter_name && (
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-general-300">{c.chapter_name}</span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-general-200">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
