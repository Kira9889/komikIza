import { Link } from 'react-router-dom'
import type { Manga } from '../../types'
import { timeAgo } from '../../lib/time'
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
    <div className="card-manga group flex cursor-pointer flex-col overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl">
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
      <div className="flex min-h-48 flex-col p-3">
        <Link to={`/manga/${manga.slug}`} className="mb-2 block min-h-11">
          <h3 className="line-clamp-2 font-bold text-xs text-general-100 transition-colors group-hover:text-primary-500 md:text-sm">
            {manga.title}
          </h3>
        </Link>
        <div className="mt-auto space-y-2">
          {rows.length === 0 && (
            <span className="block rounded-lg bg-black px-2.5 py-2 text-xs text-general-400">
              Sedang tayang
            </span>
          )}
          {rows.map(ch => (
            <Link
              key={ch.id}
              to={`/manga/${manga.slug}/chapter/${ch.id}`}
              className="chapter-border-anim relative flex w-full items-center justify-between rounded-lg bg-black px-2.5 py-2 text-left text-xs transition-all sm:px-3"
            >
              <span className="relative z-10 flex min-w-0 items-center gap-2 font-semibold">
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-600 shadow-[0_0_6px_#dc2626]" />
                <span className="truncate text-general-100">{ch.name}</span>
              </span>
              <span className="relative z-10 shrink-0 pl-2 text-[11px] text-general-400 md:text-xs">
                {ch.release_timestamp ? timeAgo(ch.release_timestamp) : ''}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
