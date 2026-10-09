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

// Kartu horizontal ala daftar update: cover + badge rating + judul +
// chapter terbaru + waktu. Dipakai saat mode tampilan "list".
export default function MangaListCard({ manga }: { manga: Manga }) {
  const ch = manga.latest_chapter
  return (
    <div className="group flex gap-3.5 overflow-hidden rounded-xl border border-(--line) bg-(--card) p-3 shadow-md transition-all duration-300 hover:shadow-xl">
      <Link
        to={`/manga/${manga.slug}`}
        className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-lg sm:w-28"
      >
        <img
          src={manga.cover_url}
          alt={manga.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-yellow-500/95 text-[10px] font-bold leading-none text-white shadow backdrop-blur-sm">
          {displayRating(manga).toFixed(1)}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <Link to={`/manga/${manga.slug}`} className="block">
            <h3 className="line-clamp-2 font-bold text-sm text-general-100 transition-colors group-hover:text-primary-500 md:text-base">
              {manga.title}
            </h3>
          </Link>
        </div>
        <div className="mt-2 space-y-1.5">
          {ch ? (
            <Link
              to={`/manga/${manga.slug}/chapter/${ch.id}`}
              className="flex w-full items-center justify-between rounded-lg bg-[#0f0f14] px-2.5 py-2 text-left text-xs transition-all hover:bg-black sm:px-3"
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500 shadow-[0_0_6px_var(--accent)]" />
                <span className="truncate text-general-100">{ch.name}</span>
              </span>
              <span className="shrink-0 pl-2 text-[11px] text-general-400 md:text-xs">
                {ch.release_timestamp ? timeAgo(ch.release_timestamp) : ''}
              </span>
            </Link>
          ) : (
            <span className="block rounded-lg bg-[#0f0f14] px-2.5 py-2 text-xs text-general-400">
              Sedang tayang
            </span>
          )}
          <div className="flex items-center gap-3 px-1 text-[11px] text-general-400">
            <span className="flex items-center gap-1">
              <EyeIcon className="h-3 w-3" />
              {formatCompact(displayViews(manga))}
            </span>
            <span className="uppercase">{manga.type}</span>
            <span>{manga.status}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
