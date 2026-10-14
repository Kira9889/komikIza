import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAnnouncements } from '../api/library'
import type { Announcement } from '../types'
import { queryKeys } from '../lib/queryKeys'
import AnnouncementCard from '../components/announcement/AnnouncementCard'

export default function AnnouncementList() {
  const { data: announcements = [], isPending } = useQuery<Announcement[]>({
    queryKey: queryKeys.announcements,
    queryFn: async () => (await fetchAnnouncements()) ?? [],
  })

  useEffect(() => {
    document.title = 'Pengumuman — Tenshi.My.id'
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 font-display text-2xl font-extrabold text-general-100">Pengumuman</h1>
      <p className="mb-6 text-sm text-general-400">Informasi terbaru seputar Tenshi.My.id.</p>

      <div className="flex flex-col gap-3">
        {announcements.map(a => (
          <AnnouncementCard key={a.id} announcement={a} />
        ))}
      </div>

      {!isPending && announcements.length === 0 && (
        <p className="py-16 text-center text-sm text-general-400">Belum ada pengumuman.</p>
      )}
    </div>
  )
}
