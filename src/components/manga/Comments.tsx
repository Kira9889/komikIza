import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchComments, postComment, deleteComment } from '../../api/library'
import type { Comment } from '../../types'
import { useAuth } from '../../context/AuthContext'

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Comments({ mangaId, chapterId }: { mangaId: string; chapterId?: string }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setBody('')
    setError('')
    fetchComments(mangaId, chapterId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mangaId, chapterId])

  const send = async () => {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      const c = await postComment(mangaId, text, chapterId)
      setItems(prev => [c, ...prev])
      setBody('')
    } catch (e: any) {
      setError(e?.message || 'Gagal mengirim komentar')
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus komentar ini?')) return
    try {
      await deleteComment(id)
      setItems(prev => prev.filter(c => c.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Gagal menghapus komentar')
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-(--line) bg-(--card) p-5">
      <h3 className="font-display text-sm font-bold uppercase tracking-wide text-general-300">
        Komentar ({items.length})
      </h3>

      {user ? (
        <div className="mt-4">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={`Komentar sebagai ${user.username}…`}
            className="input-manga resize-y"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-general-400">{body.trim().length}/1000</span>
            <button
              onClick={send}
              disabled={sending || !body.trim()}
              className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {sending ? 'Mengirim…' : 'Kirim'}
            </button>
          </div>
          {error && (
            <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-(--line) bg-(--card-2) px-4 py-3 text-sm text-general-300">
          <Link to="/login" className="font-semibold text-primary-500 hover:underline">Masuk</Link>
          {' '}dulu untuk ikut berkomentar. Tamu hanya bisa membaca.
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="py-4 text-center text-sm text-general-400">Memuat komentar…</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-general-400">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          items.map(c => {
            const canDelete = user && (user.id === c.user_id || user.role === 'admin')
            return (
              <div key={c.id} className="rounded-lg border border-(--line) bg-(--card-2) px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-500/15 text-xs font-bold text-primary-500">
                      {(c.username || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-semibold text-general-100">{c.username}</span>
                    <span className="shrink-0 text-[11px] text-general-400">{timeAgo(c.created_at)}</span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => void remove(c.id)}
                      className="shrink-0 text-[11px] text-general-400 transition hover:text-red-400"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-general-200">{c.body}</p>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
