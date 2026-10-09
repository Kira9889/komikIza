import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchComments, postComment, deleteComment, uploadCommentImage, searchGifs } from '../../api/library'
import type { Comment, GifItem } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { STICKER_PACKS, stickerName } from '../../lib/stickers'
import { MessageIcon, SendIcon, ImageIcon, EyeOffIcon, StickerIcon, GifIcon } from '../../icons'

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(/\//g, '/')
}

// Render markdown mini dengan aman: escape HTML DULU, baru format.
// Didukung: **tebal**, *miring*, ~~coret~~, ||spoiler||, ![alt](https://…)
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(src: string): string {
  let s = src
  s = s.replace(
    /!\[([^\]]*)\]\((https?:[^)\s]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy" class="mt-2 max-h-96 rounded-lg object-contain" />',
  )
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return s
}

function renderBody(body: string): string {
  const esc = escapeHtml(body)
  const withSpoiler = esc.replace(
    /\|\|(.+?)\|\|/gs,
    (_, inner) =>
      `<details class="comment-spoiler"><summary>Spoiler — klik untuk buka</summary><div>${renderInline(inner)}</div></details>`,
  )
  return renderInline(withSpoiler).replace(/\n/g, '<br />')
}

export default function Comments({ mangaId, chapterId }: { mangaId: string; chapterId?: string }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [error, setError] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [stickerTab, setStickerTab] = useState(STICKER_PACKS[0].id)
  const [gifOpen, setGifOpen] = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifs, setGifs] = useState<GifItem[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const [gifError, setGifError] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    setBody('')
    setError('')
    setReplyTo(null)
    fetchComments(mangaId, chapterId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mangaId, chapterId])

  const tops = useMemo(() => items.filter(c => !c.parent_id), [items])
  const kids = useMemo(() => {
    const map = new Map<string, Comment[]>()
    for (const c of items) {
      if (!c.parent_id) continue
      if (!map.has(c.parent_id)) map.set(c.parent_id, [])
      map.get(c.parent_id)!.push(c)
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }
    return map
  }, [items])

  const wrapSelection = (before: string, after = '') => {
    const el = taRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const sel = value.slice(s, e) || 'teks'
    setBody(value.slice(0, s) + before + sel + after + value.slice(e))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }

  const send = async () => {
    const text = body.trim()
    if (!text || sending || !user) return
    setSending(true)
    setError('')
    try {
      const c = await postComment(mangaId, text, chapterId, replyTo?.id)
      setItems(prev => [c, ...prev])
      setBody('')
      setReplyTo(null)
    } catch (e: any) {
      setError(e?.message || 'Gagal mengirim komentar')
    } finally {
      setSending(false)
    }
  }

  const insertSticker = (url: string, name: string) => {
    setBody(prev => (prev.trim() ? `${prev.trim()}\n![${name}](${url})` : `![${name}](${url})`))
    setStickerOpen(false)
    setGifOpen(false)
    taRef.current?.focus()
  }

  const doGifSearch = async () => {
    const q = gifQuery.trim()
    if (!q || gifLoading) return
    setGifLoading(true)
    setGifError('')
    try {
      setGifs(await searchGifs(q))
    } catch (err: any) {
      setGifError(err?.message || 'Gagal mencari GIF')
      setGifs([])
    } finally {
      setGifLoading(false)
    }
  }

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploadingImg) return
    setUploadingImg(true)
    setError('')
    try {
      const url = await uploadCommentImage(file)
      setBody(prev => (prev.trim() ? `${prev.trim()}\n![gambar](${url})` : `![gambar](${url})`))
      taRef.current?.focus()
    } catch (err: any) {
      setError(err?.message || 'Gagal mengunggah gambar')
    } finally {
      setUploadingImg(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus komentar ini?')) return
    try {
      await deleteComment(id)
      setItems(prev => prev.filter(c => c.id !== id && c.parent_id !== id))
    } catch (e: any) {
      setError(e?.message || 'Gagal menghapus komentar')
    }
  }

  const canDelete = (c: Comment) => user && (user.id === c.user_id || user.role === 'admin')

  const toolBtn =
    'p-1.5 rounded transition-colors hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'

  const renderAvatar = (c: Comment, size: 'w-10 h-10' | 'w-8 h-8') =>
    c.avatar_url ? (
      <img src={c.avatar_url} alt="" loading="lazy" className={`${size} shrink-0 rounded-full border border-white/10 object-cover`} />
    ) : (
      <span className={`${size} grid shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-xs font-bold text-gray-300`}>
        {(c.username || '?').slice(0, 1).toUpperCase()}
      </span>
    )

  const renderCard = (c: Comment, nested = false) => (
    <div key={c.id} className={nested ? 'flex gap-2 py-2' : 'flex gap-3 border-b border-white/10 py-4 last:border-0'}>
      {renderAvatar(c, nested ? 'w-8 h-8' : 'w-10 h-10')}
      <div className="min-w-0 flex-1">
        <div className={`flex flex-wrap items-center gap-2 ${nested ? 'text-xs' : 'text-sm'}`}>
          <span className="font-bold text-white">{c.username}</span>
          <span className={`${nested ? 'text-[10px]' : 'text-xs'} text-gray-500`}>{timeAgo(c.created_at)}</span>
        </div>
        <div
          className={`mt-1 text-gray-300 ${nested ? 'text-xs' : 'text-sm'}`}
          dangerouslySetInnerHTML={{ __html: renderBody(c.body) }}
        />
        <div className="mt-1.5 flex items-center gap-3">
          {user && (
            <button
              onClick={() => {
                setReplyTo({ id: c.id, username: c.username })
                taRef.current?.focus()
              }}
              className="text-xs font-semibold text-gray-400 transition hover:text-white"
            >
              Balas
            </button>
          )}
          {canDelete(c) && (
            <button
              onClick={() => void remove(c.id)}
              className="text-xs text-gray-500 transition hover:text-red-400"
            >
              Hapus
            </button>
          )}
        </div>
        {!nested && (kids.get(c.id) ?? []).length > 0 && (
          <div className="mt-3 space-y-2 border-l-2 border-white/10 pl-4">
            {(kids.get(c.id) ?? []).map(k => renderCard(k, true))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md md:p-8">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
        <MessageIcon className="h-5 w-5 text-primary-500" />
        KOMENTAR
      </h3>

      <form
        className="mb-6"
        onSubmit={e => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121218] shadow-2xl transition-all">
          <textarea
            ref={taRef}
            rows={4}
            maxLength={1000}
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={!user}
            placeholder={user ? 'Komen di mari...' : 'Silakan login untuk bergabung dalam diskusi'}
            className="w-full resize-y bg-transparent p-4 font-sans text-sm text-gray-100 placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#191922] px-4 py-2.5">
            <div className="flex items-center gap-1 text-gray-400">
              <button type="button" disabled={!user} onClick={() => wrapSelection('**', '**')} title="Tebal (Bold)" className={`${toolBtn} px-2 text-sm font-black`}>
                B
              </button>
              <button type="button" disabled={!user} onClick={() => wrapSelection('*', '*')} title="Cetak Miring (Italic)" className={`${toolBtn} px-2 font-serif text-sm italic`}>
                I
              </button>
              <button type="button" disabled={!user} onClick={() => wrapSelection('~~', '~~')} title="Coretan (Strikethrough)" className={`${toolBtn} px-2 text-sm line-through`}>
                S
              </button>
              <button type="button" disabled={!user} onClick={() => wrapSelection('||', '||')} title="Sembunyikan Spoiler (klik untuk buka)" className={toolBtn}>
                <EyeOffIcon className="h-4 w-4" />
              </button>
              <div className="mx-1 h-4 w-[1px] bg-white/20" />
              <button
                type="button"
                disabled={!user || uploadingImg}
                onClick={() => imgRef.current?.click()}
                title="Unggah Foto"
                className={toolBtn}
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <input ref={imgRef} type="file" accept="image/*" disabled={!user} className="hidden" onChange={onImage} />
              <button
                type="button"
                disabled={!user}
                onClick={() => {
                  setStickerOpen(v => !v)
                  setGifOpen(false)
                }}
                title="Stiker"
                className={toolBtn}
              >
                <StickerIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!user}
                onClick={() => {
                  setGifOpen(v => !v)
                  setStickerOpen(false)
                }}
                title="GIF"
                className={toolBtn}
              >
                <GifIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-gray-500">{body.trim().length}/1000</span>
              <button
                type="submit"
                disabled={!user || sending || uploadingImg || !body.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendIcon className="h-3.5 w-3.5" />
                KIRIM
              </button>
            </div>
          </div>
        </div>
        {stickerOpen && user && (
          <div className="mt-2 rounded-xl border border-white/10 bg-[#191922] p-3">
            <div className="mb-2 flex gap-1.5">
              {STICKER_PACKS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStickerTab(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    stickerTab === p.id ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto sm:grid-cols-8">
              {STICKER_PACKS.find(p => p.id === stickerTab)!.files.map(f => {
                const name = stickerName(f)
                const url = `${STICKER_PACKS.find(p => p.id === stickerTab)!.base}/${f}`
                return (
                  <button
                    key={f}
                    type="button"
                    title={name}
                    onClick={() => insertSticker(url, name)}
                    className="rounded-lg p-1 transition hover:bg-white/10"
                  >
                    <img src={url} alt={name} loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 object-contain" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {gifOpen && user && (
          <div className="mt-2 rounded-xl border border-white/10 bg-[#191922] p-3">
            <div className="flex gap-2">
              <input
                value={gifQuery}
                onChange={e => setGifQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void doGifSearch()
                  }
                }}
                placeholder="Cari GIF…"
                className="input-manga py-2! text-sm"
              />
              <button
                type="button"
                onClick={() => void doGifSearch()}
                disabled={gifLoading || !gifQuery.trim()}
                className="btn-primary shrink-0 rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-60"
              >
                {gifLoading ? '…' : 'Cari'}
              </button>
            </div>
            {gifError && (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {gifError} Minta admin pasang GIPHY_API_KEY dulu.
              </p>
            )}
            {gifs.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {gifs.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    title={g.title}
                    onClick={() => insertSticker(g.full, g.title || 'gif')}
                    className="overflow-hidden rounded-lg transition hover:ring-2 hover:ring-primary-500"
                  >
                    <img src={g.preview} alt={g.title} loading="lazy" className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {replyTo && (
          <p className="mt-2 text-xs text-gray-400">
            Membalas <span className="font-semibold text-primary-400">@{replyTo.username}</span>{' '}
            <button type="button" onClick={() => setReplyTo(null)} className="font-semibold hover:text-white">
              ✕ batal
            </button>
          </p>
        )}
        {!user && (
          <p className="mt-2 text-xs text-gray-400">
            <Link to="/login" className="font-semibold text-primary-400 hover:underline">Masuk</Link> dulu untuk berkomentar. Tamu hanya bisa membaca.
          </p>
        )}
        {error && (
          <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
        )}
      </form>

      <div>
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-400">Memuat komentar…</p>
        ) : tops.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          <>
            <p className="mb-1 text-sm text-gray-400">
              <span className="font-bold text-white">{items.length}</span> Komentar
            </p>
            {tops.map(c => renderCard(c))}
          </>
        )}
      </div>
    </section>
  )
}
