import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { CloseIcon, EditIcon, UserIcon } from '../../icons'

export default function ProfilePopup({ onClose }: { onClose: () => void }) {
  const { user, logout, updateUsername } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user) return null

  const handleLogout = () => {
    logout()
    onClose()
    navigate('/')
  }

  const startEdit = () => {
    setName(user.username)
    setError('')
    setEditing(true)
  }

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await updateUsername(name)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setEditing(false)
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Profil"
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-(--line) bg-(--card) p-6 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-lg text-general-400 transition hover:bg-white/10 hover:text-general-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mx-auto w-fit">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-500/15 text-2xl font-bold uppercase text-primary-400">
            {user.username.charAt(0)}
          </span>
          <button
            onClick={startEdit}
            aria-label="Ubah username"
            title="Ubah username"
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-(--line) bg-(--card-2) text-general-400 shadow transition hover:text-primary-400"
          >
            <EditIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        {editing ? (
          <form onSubmit={saveName} className="mt-3 space-y-2">
            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                {error}
              </p>
            )}
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Username baru"
              maxLength={24}
              className="input-manga text-center"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={busy}
                className="btn-ghost flex-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn-primary flex-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        ) : (
          <h2 className="mt-3 truncate font-display text-lg font-extrabold">{user.username}</h2>
        )}
        <p className="mt-1 truncate text-sm text-general-400">{user.email}</p>
        <span
          className={`mt-2 inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
            user.role === 'admin' ? 'bg-primary-500/15 text-primary-400' : 'bg-white/5 text-general-400'
          }`}
        >
          {user.role}
        </span>

        <div className="mt-5 space-y-2">
          {user.role === 'admin' && (
            <Link
              to="/admin"
              onClick={onClose}
              className="btn-ghost block rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Panel Admin
            </Link>
          )}
          <Link
            to="/library"
            onClick={onClose}
            className="btn-ghost flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            <UserIcon className="h-4 w-4" />
            Library Saya
          </Link>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
