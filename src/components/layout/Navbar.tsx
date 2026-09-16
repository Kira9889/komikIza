import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../Logo'
import ProfilePopup from '../auth/ProfilePopup'
import {
  HomeIcon,
  CompassIcon,
  LibraryIcon,
  SearchIcon,
  MenuIcon,
  CloseIcon,
  MoonIcon,
  SunIcon,
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
  const [showProfile, setShowProfile] = useState(false)
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

  const closeMenu = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--bg)/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <Logo size={48} />
          <span className="font-display text-xl font-extrabold tracking-tight">
            Tenshi<span className="text-primary-500">.id</span>
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
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 rounded-lg border border-(--line) bg-(--card-2) px-3 py-1.5 transition hover:border-primary-500/50"
              aria-label="Buka profil"
            >
              <UserAvatarInitial name={user.username} />
              <span className="max-w-24 truncate text-sm font-medium text-general-300">
                {user.username}
              </span>
            </button>
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

      {/* Dropdown mobile */}
      {open && (
        <nav className="border-t border-(--line) bg-(--bg) px-4 py-3 md:hidden">
          <div className="space-y-1">
            {navLinks.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-primary-500/10 text-primary-500' : 'text-general-300 hover:bg-white/5'
                  }`
                }
              >
                <l.icon className="h-5 w-5" />
                {l.label === 'Search' ? 'All Series' : l.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-(--line) pt-3">
            <button
              onClick={toggleTheme}
              aria-label="Ganti tema"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-(--line) text-general-300"
            >
              {dark ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
            </button>
            {user ? (
              <>
                <button
                  onClick={() => {
                    closeMenu()
                    setShowProfile(true)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-(--line) bg-(--card-2) px-3 py-2"
                >
                  <UserAvatarInitial name={user.username} />
                  <span className="truncate text-sm font-medium text-general-300">
                    {user.username}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  className="shrink-0 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={closeMenu}
                className="btn-primary flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                Masuk
              </Link>
            )}
          </div>
        </nav>
      )}

      {showProfile && <ProfilePopup onClose={() => setShowProfile(false)} />}
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