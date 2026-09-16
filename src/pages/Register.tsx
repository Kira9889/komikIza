import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiBase } from '../lib/api'
import Logo from '../components/Logo'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

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
    // Akun baru wajib verifikasi kode yang dikirim ke Gmail.
    if (res.needsVerification) {
      navigate('/verify-email', { replace: true, state: { email: res.email ?? email } })
      return
    }
    navigate('/', { replace: true })
  }

  const googleRegister = async () => {
    setError('')
    setBusy(true)
    try {
      const r = await fetch(`${getApiBase()}/auth/google/url`).then(x => x.json())
      if (!r.url) throw new Error('Login Google belum dikonfigurasi.')
      window.location.href = r.url
    } catch (e: any) {
      setError(e.message || 'Login Google gagal.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <Logo size={56} />
        <span className="font-display text-xl font-extrabold">
          Tenshi<span className="text-primary-500">.id</span>
        </span>
      </div>

      <h1 className="font-display text-2xl font-extrabold">Daftar</h1>
      <p className="mt-1 text-sm text-general-400">Buat akun untuk mulai membaca.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="namamu"
            className="input-manga"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="kamu@gmail.com"
            className="input-manga"
          />
          <p className="mt-1 text-xs text-general-400">Khusus email @gmail.com — kode verifikasi dikirim ke sana.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="min. 6 karakter"
              className="input-manga"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="confirm">
              Ulangi
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="ulangi password"
              className="input-manga"
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

      <div className="my-4 flex items-center gap-3 text-xs text-general-400">
        <span className="h-px flex-1 bg-white/10" />
        atau
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={googleRegister}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-(--line) bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-60"
      >
        <GoogleIcon />
        Daftar dengan Google
      </button>

      <p className="mt-6 text-center text-sm text-general-400">
        Sudah punya akun?{' '}
        <Link to="/login" className="font-semibold text-primary-500 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.4 7.5 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.5 8.9 0 10.4 0 12s.5 3.1 1.5 4.5l3.7-2.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.6 1.5 6.9l3.7 2.9c.9-2.9 3.6-5.1 6.8-5.1z"
      />
    </svg>
  )
}