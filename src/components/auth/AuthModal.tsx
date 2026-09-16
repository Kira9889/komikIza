import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { CloseIcon } from '../../icons'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-(--line) bg-(--card) p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-black/20 p-1">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                  tab === t ? 'bg-primary-500 text-white' : 'text-general-400 hover:text-general-100'
                }`}
              >
                {t === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-lg text-general-400 transition hover:bg-white/10 hover:text-general-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {tab === 'login' ? <LoginForm onDone={onClose} /> : <RegisterForm onDone={onClose} />}
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
      {message}
    </div>
  )
}

const inputCls = 'input-manga'

function LoginForm({ onDone }: { onDone: () => void }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await login({ email, password })
    setBusy(false)
    if (res.error) {
      // Belum verifikasi → tutup modal, lanjut ke halaman kode.
      if (res.needsVerification) {
        onDone()
        navigate('/verify-email', { state: { email: res.email ?? email } })
        return
      }
      setError(res.error)
      return
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <h2 className="font-display text-xl font-extrabold">Selamat datang kembali.</h2>
      <ErrorBox message={error} />
      <div>
        <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="modal-email">
          Email
        </label>
        <input
          id="modal-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="kamu@email.com"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="modal-password">
          Password
        </label>
        <input
          id="modal-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputCls}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? 'Memproses…' : 'Masuk'}
      </button>
    </form>
  )
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok')
      return
    }
    setBusy(true)
    const res = await register({ username, email, password })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    // Akun baru wajib verifikasi kode → tutup modal, lanjut ke halaman kode.
    if (res.needsVerification) {
      onDone()
      navigate('/verify-email', { state: { email: res.email ?? email } })
      return
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <h2 className="font-display text-xl font-extrabold">Buat akun untuk menyimpan bookmark.</h2>
      <ErrorBox message={error} />
      <div>
        <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="modal-username">
          Username
        </label>
        <input
          id="modal-username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="namamu"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="modal-reg-email">
          Email
        </label>
          <input
            id="modal-reg-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="kamu@gmail.com"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-general-400">Khusus @gmail.com — kode verifikasi dikirim ke sana.</p>
        </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="modal-reg-pass">
            Password
          </label>
          <input
            id="modal-reg-pass"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="min. 6 karakter"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="modal-reg-confirm">
            Ulangi
          </label>
          <input
            id="modal-reg-confirm"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="ulangi password"
            className={inputCls}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? 'Memproses…' : 'Daftar'}
      </button>
    </form>
  )
}
