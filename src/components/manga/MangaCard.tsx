import { Link } from 'react-router-dom'
import type { Manga } from '../../types'
import { displayRating, displayViews } from '../../lib/stats'
import { EyeIcon } from '../../icons'

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

// Kartu vertikal: cover + judul + 3 chapter terbaru (garis cahaya muter).
export default function MangaCard({ manga }: { manga: Manga }) {
  const rows = (manga.latest_chapters?.length ? manga.latest_chapters : manga.latest_chapter ? [manga.latest_chapter] : []).slice(0, 3)
  return (
    <div className="card-manga group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:shadow-xl">
      <Link to={`/manga/${manga.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-(--card-2)">
        <img
          src={manga.cover_url}
          alt={manga.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <span className="clip-tag absolute left-0 top-3 bg-primary-500 px-2 py-0.5 text-xs font-bold uppercase text-white">
          {manga.type}
        </span>
        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white/90">
          <EyeIcon className="h-3.5 w-3.5" />
          {formatCompact(displayViews(manga))}
        </span>
        <span className="absolute bottom-2 right-2 text-xs font-semibold text-primary-400">
          ★ {displayRating(manga).toFixed(1)}
        </span>
      </Link>
      <div className="flex min-h-[13rem] flex-1 flex-col p-2.5 sm:p-3">
        <Link to={`/manga/${manga.slug}`} className="mb-2 block min-h-11">
          <h3 className="line-clamp-2 text-xs font-bold leading-5 text-general-100 transition-colors group-hover:text-primary-500 sm:text-sm">
            {manga.title}
          </h3>
        </Link>
        <div className="mt-auto min-h-[7.5rem] space-y-1.5">
          {rows.length === 0 && (
            <span className="flex h-9 items-center rounded-lg bg-black/40 px-2.5 text-xs text-general-400">
              Sedang tayang
            </span>
          )}
          {rows.map(ch => (
            <Link
              key={ch.id}
              to={`/manga/${manga.slug}/chapter/${ch.id}`}
              className="chapter-border-anim relative flex h-9 w-full items-center rounded-lg border border-white/5 bg-black/30 px-2 text-left text-xs transition-all hover:bg-black/50 sm:px-2.5"
            >
              <span className="relative z-10 flex min-w-0 items-center gap-2 font-semibold">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500 shadow-[0_0_6px_var(--accent)]" />
                <span className="truncate text-general-100">{ch.name}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
