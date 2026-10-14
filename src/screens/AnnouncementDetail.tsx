import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAnnouncementById } from '../api/library'
import type { Announcement } from '../types'
import { queryKeys } from '../lib/queryKeys'
import { formatDate } from '../lib/time'
import { ArrowLeftIcon } from '../icons'

export default function AnnouncementDetail() {
  const { id } = useParams<{ id: string }>()
  const { data, isPending, isError } = useQuery<Announcement | null>({
    queryKey: queryKeys.announcement(id ?? ''),
    queryFn: () => fetchAnnouncementById(id ?? ''),
    enabled: !!id,
  })

  useEffect(() => {
    document.title = data ? `${data.title} — Tenshi.My.id` : 'Pengumuman — Tenshi.My.id'
  }, [data?.title])

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-(--card)" />
          <div className="h-56 w-full rounded-xl bg-(--card)" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-general-400">Pengumuman tidak ditemukan.</p>
        <Link to="/announcement" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500">
          <ArrowLeftIcon className="h-4 w-4" /> Kembali ke daftar pengumuman
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/announcement" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-general-300 transition-colors hover:text-primary-500">
        <ArrowLeftIcon className="h-4 w-4" /> Semua pengumuman
      </Link>

      <h1 className="font-display text-2xl font-extrabold leading-tight text-general-100 md:text-3xl">{data.title}</h1>
      <p className="mt-2 text-sm text-general-400">{formatDate(data.created_at)}</p>

      {data.image_url && (
        <img
          src={data.image_url}
          alt={data.title}
          className="mt-6 w-full rounded-xl border border-(--line) object-cover"
        />
      )}

      {data.body && (
        <div className="mt-6 text-sm leading-relaxed whitespace-pre-line text-general-200">{data.body}</div>
      )}
    </div>
  )
}
