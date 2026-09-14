import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileNav from './MobileNav'

export default function Layout() {
  const { pathname } = useLocation()
  // Mode baca imersif: navbar, footer, dan bottom-nav disembunyikan
  // di halaman baca chapter agar tidak menutupi tombol prev/next.
  const isReader = /\/manga\/.+\/chapter\//.test(pathname)
  return (
    <div className={`flex min-h-screen flex-col ${isReader ? '' : 'pb-16 lg:pb-0'}`}>
      {!isReader && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isReader && <Footer />}
      {!isReader && <MobileNav />}
    </div>
  )
}