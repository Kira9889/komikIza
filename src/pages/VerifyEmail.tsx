import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

const COOLDOWN = 60

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { verifyEmail, resendCode } = useAuth()
  const [email, setEmail] = useState<string>(() => (location.state as any)?.email ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (code.trim().length !== 6) {
      setError('Kode terdiri dari 6 digit.')
      return
    }
    setBusy(true)
    const res = await verifyEmail({ email, code: code.trim() })
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    navigate('/', { replace: true })
  }

  const resend = async () => {
    setError('')
    setInfo('')
    setBusy(true)
    const res = await resendCode(email)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setInfo('Kode baru dikirim ke Gmail kamu.')
    setCooldown(COOLDOWN)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <Logo size={56} />
        <span className="font-display text-xl font-extrabold">
          Tenshi<span className="text-primary-500">.id</span>
        </span>
      </div>

      <h1 className="font-display text-2xl font-extrabold">Verifikasi email</h1>
      <p className="mt-1 text-sm text-general-400">
        Kode 6 digit dikirim ke <span className="font-semibold text-general-200">{email || 'Gmail kamu'}</span>.
        Berlaku 10 menit.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
            {info}
          </div>
        )}
        {!email && (
          <div>
            <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="vemail">
              Gmail
            </label>
            <input
              id="vemail"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="kamu@gmail.com"
              className="input-manga"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-general-300" htmlFor="code">
            Kode verifikasi
          </label>
          <input
            id="code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="input-manga text-center text-2xl font-extrabold tracking-[0.5em]"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? 'Memproses…' : 'Verifikasi & Masuk'}
        </button>
      </form>

      <button
        type="button"
        onClick={resend}
        disabled={busy || cooldown > 0 || !email}
        className="mt-4 w-full rounded-lg border border-(--line) py-2.5 text-sm font-semibold text-general-200 transition hover:border-primary-500/50 disabled:opacity-60"
      >
        {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim ulang kode'}
      </button>

      <p className="mt-6 text-center text-sm text-general-400">
        Salah email?{' '}
        <Link to="/register" className="font-semibold text-primary-500 hover:underline">
          Daftar ulang
        </Link>
      </p>
    </div>
  )
}
