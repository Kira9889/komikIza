import { useEffect, useLayoutEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileNav from './MobileNav'

// Posisi scroll disimpan per path di sessionStorage: location.key berubah saat
// tombol Back ditekan (Next ikut menulis ulang history state), jadi key tidak
// bisa diandalkan. sessionStorage juga bertahan bila halaman ter-reload.
const STORAGE_KEY = 'tenshi_scroll_positions'

// Pemulihan berjalan beberapa frame: rute berat dimuat lazy + datanya async,
// jadi dokumen belum cukup tinggi saat render pertama dan scrollTo() sempat
// ter-clamp. Batas waktu mencegah perulangan tanpa henti.
const RESTORE_TIMEOUT_MS = 5000

function readPositions(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function writePosition(path: string, y: number) {
  if (typeof window === 'undefined') return
  try {
    const all = readPositions()
    all[path] = y
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* storage penuh / diblokir — pemulihan cukup dilewati */
  }
}

// Server render tidak punya layout, jadi jatuh ke useEffect saat SSR.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function Layout() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const { pathname } = location

  useIsomorphicLayoutEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

    // Hanya navigasi mundur (Back/Forward) yang memulihkan posisi; membuka
    // halaman lewat link selalu mulai dari atas.
    const target = navigationType === 'POP' ? readPositions()[pathname] ?? 0 : 0
    // html memakai scroll-behavior: smooth, jadi scrollTo() beranimasi dan
    // pemulihan nyangkut di tengah jalan. Paksa lompat instan.
    const jumpTo = (y: number) => window.scrollTo({ top: y, left: 0, behavior: 'instant' })

    // Selama memulihkan, scroll yang kita picu sendiri tidak dicatat — kalau
    // tidak, posisi tersimpan tertimpa nilai yang masih ter-clamp.
    let restoring = target > 0
    let cancelled = false
    let frame = 0
    const deadline = performance.now() + RESTORE_TIMEOUT_MS

    const saveScrollPosition = () => {
      if (restoring) return
      // Saat pindah halaman, URL sudah berubah lebih dulu sementara DOM lama
      // masih dibongkar. Perubahan tinggi itu memicu scroll event palsu yang
      // membaca posisi ter-clamp — jangan sampai menimpa posisi asli.
      if (window.location.pathname !== pathname) return
      writePosition(pathname, window.scrollY)
    }

    const stopRestoring = () => {
      cancelled = true
      restoring = false
      cancelAnimationFrame(frame)
    }

    const settle = () => {
      if (cancelled) return
      if (Math.abs(window.scrollY - target) <= 2 || performance.now() > deadline) {
        restoring = false
        return
      }
      // Dokumen yang belum cukup tinggi membuat lompatan ter-clamp; tinggi itu
      // bertambah seiring konten lazy selesai dimuat, jadi lompatan berikutnya
      // akan berhasil. Penghentian hanya lewat niat gulir user (event di bawah).
      jumpTo(target)
      frame = requestAnimationFrame(settle)
    }

    // Niat gulir dari user menghentikan pemulihan agar tidak terasa dipaksa.
    const onScrollbarDrag = (e: MouseEvent) => {
      if (e.clientX >= document.documentElement.clientWidth) stopRestoring()
    }

    window.addEventListener('scroll', saveScrollPosition, { passive: true })
    window.addEventListener('wheel', stopRestoring, { passive: true })
    window.addEventListener('touchstart', stopRestoring, { passive: true })
    window.addEventListener('keydown', stopRestoring)
    window.addEventListener('mousedown', onScrollbarDrag)

    jumpTo(target)
    if (restoring) frame = requestAnimationFrame(settle)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', saveScrollPosition)
      window.removeEventListener('wheel', stopRestoring)
      window.removeEventListener('touchstart', stopRestoring)
      window.removeEventListener('keydown', stopRestoring)
      window.removeEventListener('mousedown', onScrollbarDrag)
    }
  }, [pathname, navigationType])

  // Mode baca imersif: navbar, footer, dan bottom-nav disembunyikan
  // di halaman baca chapter agar tidak menutupi tombol prev/next.
  const isReader = /\/manga\/.+\/chapter\//.test(pathname)
  return (
    <div className={`flex min-h-screen flex-col ${isReader ? '' : 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0'}`}>
      {!isReader && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isReader && <Footer />}
      {!isReader && <MobileNav />}
    </div>
  )
}
