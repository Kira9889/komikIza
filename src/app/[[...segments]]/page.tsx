import { cache } from 'react'
import type { Metadata } from 'next'
import { dehydrate, QueryClient } from '@tanstack/react-query'
import Providers from '../providers'
import ClientApp from '../client-app'
import { fetchAnnouncements, fetchChapters, fetchHomeCollections, fetchMangaBySlug, fetchMangaList, listGenres } from '../../api/library'
import { queryKeys } from '../../lib/queryKeys'

export const dynamic = 'force-dynamic'

type RouteProps = {
  params: Promise<{ segments?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const getManga = cache((slug: string) => fetchMangaBySlug(slug))

export async function generateMetadata({ params, searchParams }: RouteProps): Promise<Metadata> {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams])
  const route = `/${segments.join('/')}`

  if (segments[0] === 'manga' && segments[1]) {
    const manga = await getManga(segments[1])
    if (manga) {
      return {
        title: manga.title,
        description: manga.description.slice(0, 160),
        alternates: { canonical: `/manga/${manga.slug}` },
        openGraph: { title: manga.title, description: manga.description.slice(0, 160), images: [manga.cover_url] },
      }
    }
  }

  if (route === '/explore') return { title: 'Jelajahi Komik' }
  if (route === '/search') {
    const queryText = typeof query.q === 'string' ? query.q : ''
    return { title: queryText ? `Cari ${queryText}` : 'Cari Komik' }
  }
  if (route === '/login') return { title: 'Masuk' }
  if (route === '/register') return { title: 'Daftar' }
  return { title: 'Digital Manga Library' }
}

export default async function AppRoute({ params, searchParams }: RouteProps) {
  const [{ segments = [] }, query] = await Promise.all([params, searchParams])
  const route = `/${segments.join('/')}` || '/'
  const location = `${route === '/' ? '' : route}${toSearchString(query)}` || '/'
  const queryClient = new QueryClient()

  if (route === '/') {
    await Promise.all([
      queryClient.prefetchQuery({ queryKey: queryKeys.home, queryFn: fetchHomeCollections }),
      queryClient.prefetchQuery({ queryKey: queryKeys.announcements, queryFn: async () => (await fetchAnnouncements()) ?? [] }),
    ])
  } else if (route === '/explore' || route === '/search') {
    await Promise.all([
      queryClient.prefetchQuery({ queryKey: queryKeys.mangaList, queryFn: () => fetchMangaList() }),
      queryClient.prefetchQuery({ queryKey: queryKeys.genres, queryFn: listGenres }),
    ])
  } else if (route.startsWith('/manga/')) {
    const slug = segments[1]
    if (slug) {
      const manga = await queryClient.fetchQuery({ queryKey: queryKeys.manga(slug), queryFn: () => getManga(slug) })
      if (manga) {
        await queryClient.prefetchQuery({ queryKey: queryKeys.chapters(manga.id), queryFn: () => fetchChapters(manga.id, { slim: true }) })
      }
    }
  }

  const staticLocation = route === '/admin' ? '/admin/manga' : location

  return (
    <Providers state={dehydrate(queryClient)}>
      <ClientApp location={staticLocation} />
    </Providers>
  )
}

function toSearchString(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach(item => params.append(key, item))
    else if (typeof value === 'string') params.set(key, value)
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}
