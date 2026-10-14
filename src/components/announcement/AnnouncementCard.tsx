import { Link } from 'react-router-dom'
import type { Announcement } from '../../types'
import { formatDate } from '../../lib/time'

// Kartu pengumuman: thumbnail persegi + judul + tanggal. Dipakai di Home
// (carousel) maupun halaman daftar /announcement.
export default function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const { id, title, image_url, created_at } = announcement
  return (
    <Link
      to={`/announcement/${id}`}
      className="flex items-center gap-4 rounded-2xl bg-(--card) p-3 transition-colors hover:bg-(--card-2)"
    >
      {image_url ? (
        <img
          src={image_url}
          alt={title}
          loading="lazy"
          className="aspect-square w-19 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="aspect-square w-19 shrink-0 rounded-lg bg-(--card-2)" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 text-sm font-semibold text-general-100">{title}</span>
        <span className="text-xs text-general-400">{formatDate(created_at)}</span>
      </div>
    </Link>
  )
}
