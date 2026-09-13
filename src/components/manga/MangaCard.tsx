import { Link } from 'react-router-dom'
import type { Manga } from '../../types'
import { EyeIcon } from '../../icons'

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

export default function MangaCard({ manga }: { manga: Manga }) {
  return (
    <Link
      to={`/manga/${manga.slug}`}
      className="card-manga group overflow-hidden rounded-lg"
    >
      <div className="relative aspect-3/4 overflow-hidden bg-(--card-2)">
        <img
          src={manga.cover_url}
          alt={manga.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
        <span className="clip-tag absolute left-0 top-3 bg-primary-500 px-2 py-0.5 text-xs font-bold uppercase text-white">
          {manga.type}
        </span>
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-2.5">
          <span className="flex items-center gap-1 text-xs text-white/90">
            <EyeIcon className="h-3.5 w-3.5" />
            {formatCompact(manga.views_count)}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-primary-400">
            <Star className="h-3.5 w-3.5" />
            {manga.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 font-display text-sm font-bold text-general-100">
          {manga.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-general-400">
          {manga.latest_chapter?.name ?? 'Sedang tayang'}
        </p>
      </div>
    </Link>
  )
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  )
}