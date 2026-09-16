import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Google redirect ke sini dengan ?code=... lalu kita tukar ke JWT backend.
export default function GoogleCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const ran = useRef(false)

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
        </>
      )}
    </div>
  )
}
