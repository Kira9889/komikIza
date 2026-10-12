import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Google redirect ke sini dengan ?code=... lalu kita tukar ke JWT backend.
export default function GoogleCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [slowServer, setSlowServer] = useState(false)
  const ran = useRef(false)

  // Kalau >10 detik belum kelar, kemungkinan server gratis sedang bangun
  // dari tidur — kasih tahu user agar tidak pergi sebelum token kesimpen
  // (itu yang bikin "pindah ke home tapi tidak login").
  useEffect(() => {
    if (error) return
    const t = setTimeout(() => setSlowServer(true), 10_000)
    return () => clearTimeout(t)
  }, [error])

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      const code = params.get('code')
      const err = params.get('error')
      if (err) {
        setError('Login Google dibatalkan.')
        return
      }
      if (!code) {
        setError('Kode Google tidak ada.')
        return
      }
      const res = await loginWithGoogle(code)
      if (res.error) {
        setError(res.error)
        return
      }
      navigate('/', { replace: true })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      {error ? (
        <>
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
          <Link to="/login" className="mt-4 text-sm font-semibold text-primary-500 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </>
      ) : (
        <>
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-primary-500" />
          <p className="mt-3 text-sm text-general-400">Menghubungkan akun Google…</p>
          {slowServer && (
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-general-400">
              Server gratis sedang aktif kembali dari mode tidur (±1 menit). Jangan tutup/pindah halaman dulu ya.
            </p>
          )}
        </>
      )}
    </div>
  )
}
