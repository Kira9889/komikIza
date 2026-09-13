import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await login({ email, password })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <Logo size={56} />
        <span className="font-display text-xl font-extrabold">
          Iza<span className="text-primary-500">Lib</span>
        </span>
      </div>

      <h1 className="font-display text-2xl font-extrabold">Masuk</h1>
      <p className="mt-1 text-sm text-general-400">Selamat datang kembali.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            className="input-manga"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-manga"
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

      <p className="mt-6 text-center text-sm text-general-400">
        Belum punya akun?{' '}
        <Link to="/register" className="font-semibold text-primary-500 hover:underline">
          Daftar
        </Link>
      </p>
    </div>
  )
}