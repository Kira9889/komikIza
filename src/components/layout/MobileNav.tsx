import { NavLink } from 'react-router-dom'
import { HomeIcon, CompassIcon, LibraryIcon, SearchIcon } from '../../icons'

const items = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/explore', label: 'Explore', icon: CompassIcon },
  { to: '/library', label: 'Library', icon: LibraryIcon },
  { to: '/search', label: 'All Series', icon: SearchIcon },
]

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-screen border-t border-(--line) bg-(--bg) lg:hidden">
      <div className="grid grid-cols-4">
        {items.map(it => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-[10px] font-medium ${
                isActive ? 'text-primary-500' : 'text-general-400'
              }`
            }
          >
            <it.icon className="h-6 w-6" />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}