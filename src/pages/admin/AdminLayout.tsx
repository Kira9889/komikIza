import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../components/Logo'
import { MenuIcon, CloseIcon, ArrowLeftIcon } from '../../icons'

const menu = [
  { to: '/admin/manga', label: 'Buku (Manga)', end: false },
  { to: '/admin/genres', label: 'Genre', end: false },
  { to: '/admin/authors', label: 'Pengarang', end: false },
  { to: '/admin/chapters', label: 'Chapter', end: false },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const baseCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-primary-500/15 text-primary-400' : 'text-general-300 hover:text-general-100'
    }`

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-(--line) px-5 py-4">
        <Logo size={40} />
        <div>
          <div className="font-display text-sm font-extrabold">Admin</div>
          <div className="text-[11px] text-general-400">IzaLib</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menu.map(m => (
          <NavLink key={m.to} to={m.to} end={m.end} className={baseCls} onClick={() => setOpen(false)}>
            {m.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-(--line) p-4">
        <NavLink to="/" className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-general-300 hover:text-general-100">
          <ArrowLeftIcon className="h-4 w-4" />
          Kembali ke situs
        </NavLink>
        <div className="flex items-center justify-between px-1">
          <span className="truncate text-sm text-general-300">
            {user?.username ?? 'Admin'}
          </span>
          <button
            onClick={logout}
            className="rounded-md px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-(--line) bg-(--bg-dark) lg:block">
        {sidebar}
      </aside>

      <button
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-primary-500 text-white shadow-lg lg:hidden"
        onClick={() => setOpen(v => !v)}
        aria-label="Menu admin"
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-(--bg-dark)">
            {sidebar}
          </aside>
        </div>
      )}

      <main className="flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}