import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookIcon } from '../icons'

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
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-500 text-white">
          <BookIcon className="h-5 w-5" />
        </span>
        <span className="font-display text-xl font-extrabold">
          Iza<span className="text-primary-500">Lib</span>
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
            placeholder="kamu@email.com"
            className="input-manga"
          />
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

      <p className="mt-6 text-center text-sm text-general-400">
        Sudah punya akun?{' '}
        <Link to="/login" className="font-semibold text-primary-500 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  )
}