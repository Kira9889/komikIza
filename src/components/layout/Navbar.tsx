import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  HomeIcon,
  CompassIcon,
  LibraryIcon,
  SearchIcon,
  MenuIcon,
  CloseIcon,
  MoonIcon,
  SunIcon,
  BookIcon,
} from '../../icons'

const navLinks = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/explore', label: 'Explore', icon: CompassIcon },
  { to: '/library', label: 'Library', icon: LibraryIcon },
  { to: '/search', label: 'Search', icon: SearchIcon },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
    isActive ? 'text-primary-500' : 'text-general-300 hover:text-general-100'
  }`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
    setDark(v => !v)
  }

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--bg)/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-500 text-white shadow-[0_0_16px_rgba(111,57,238,0.35)]">
            <BookIcon className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Iza<span className="text-primary-500">Lib</span>
          </span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <NavLink key={l.to} to={l.to} className={navClass} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Ganti tema"
            className="grid h-9 w-9 place-items-center rounded-lg border border-(--line) text-general-300 transition hover:border-primary-500/50 hover:text-primary-500"
          >
            {dark ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === 'admin' && (
                <Link to="/admin" className="btn-ghost rounded-lg px-3 py-2 text-sm font-semibold">
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-2 rounded-lg border border-(--line) bg-(--card-2) px-3 py-1.5">
                <UserAvatarInitial name={user.username} />
                <span className="max-w-24 truncate text-sm font-medium text-general-300">
                  {user.username}
                </span>
                <button onClick={handleLogout} className="text-xs font-semibold text-red-400 hover:underline">
                  Keluar
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
              <UserAvatarInitial />
              Masuk
            </Link>
          )}
        </div>

        <button
          className="grid h-9 w-9 place-items-center rounded-lg border border-(--line) text-general-300 md:hidden"
          aria-label="Menu"
          onClick={() => setOpen(v => !v)}
        >
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  )
}

function UserAvatarInitial({ name = 'G' }: { name?: string }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20 text-xs font-bold uppercase">
      {name.charAt(0)}
    </span>
  )
}