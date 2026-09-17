import { apiFetch, isBackendOnline } from '../lib/api'
import {
  storeManga,
  storeGenres as mockStoreGenres,
  storeAuthors as mockStoreAuthors,
  createManga as mockCreateManga,
  updateManga as mockUpdateManga,
  deleteManga as mockDeleteManga,
  ensureGenres as mockEnsureGenres,
  ensureAuthors as mockEnsureAuthors,
  getChaptersCached,
} from '../data/store'
import type { Manga, Genre, Author, Chapter, HomeCollections, MangaInput } from '../types'

// ---------------------------------------------------------------
// PUBLIC READ API
// ---------------------------------------------------------------
export async function fetchHomeCollections(): Promise<HomeCollections> {
  if (!(await isBackendOnline())) {
    await delay(300)
    return mockHomeCollections()
  }
  try {
    return await apiFetch<HomeCollections>('/manga/home')
  } catch (e) {
    console.error(e)
    return mockHomeCollections()
  }
}

export async function fetchMangaList(params?: {
  type?: string
  search?: string
  genre?: string
  order?: string
}): Promise<Manga[]> {
  if (!(await isBackendOnline())) {
    await delay(250)
    return mockFilterManga(params)
  }
  const query: Record<string, string> = {}
  if (params?.type) query.type = params.type
  if (params?.search) query.search = params.search
  if (params?.genre) query.genre = params.genre
  if (params?.order) query.order = params.order
  // Cache baca 2 menit: gonta-ganti filter/genre tidak mengunduh ulang
  // 1000 judul berkali-kali.
  const key = JSON.stringify(query)
  const hit = mangaListCache.get(key)
  if (hit && Date.now() - hit.at < MANGA_LIST_TTL) return hit.data
  try {
    const data = await apiFetch<Manga[]>('/manga', { query })
    mangaListCache.set(key, { at: Date.now(), data })
    if (mangaListCache.size > 50) mangaListCache.clear()
    return data
  } catch (e) {
    console.error(e)
    return mockFilterManga(params)
  }
}

const mangaListCache = new Map<string, { at: number; data: Manga[] }>()
const MANGA_LIST_TTL = 2 * 60 * 1000

export async function fetchMangaBySlug(slug: string): Promise<Manga | null> {
  if (!(await isBackendOnline())) {
    await delay(150)
    return storeManga.find(m => m.slug === slug) ?? null
  }
  try {
    return await apiFetch<Manga>(`/manga/${encodeURIComponent(slug)}`)
  } catch (e: any) {
    console.error(e)
    if (e.status === 404) return null
    return storeManga.find(m => m.slug === slug) ?? null
  }
}

export async function fetchChapters(mangaId: string, opts?: { slim?: boolean }): Promise<Chapter[]> {
  if (!(await isBackendOnline())) {
    await delay(200)
    return getChaptersCached(mangaId)
  }
  try {
    return await apiFetch<Chapter[]>(`/manga/${mangaId}/chapters`, {
      query: opts?.slim ? { slim: '1' } : undefined,
    })
  } catch (e) {
    console.error(e)
    return getChaptersCached(mangaId)
  }
}

// ID chapter yang sudah dibaca user untuk 1 judul (login + online saja).
export async function fetchReadChapters(mangaId: string): Promise<string[]> {
  try {
    const res = await apiFetch<{ ids: string[] }>('/me/read-chapters', {
      query: { manga_id: mangaId },
    })
    return res.ids
  } catch (e) {
    console.error(e)
    return []
  }
}

// +1 view saat user membuka chapter (fire-and-forget, publik).
export async function recordView(mangaId: string): Promise<void> {
  if (!(await isBackendOnline())) return
  try {
    await apiFetch(`/manga/${mangaId}/view`, { method: 'POST', body: '{}' })
  } catch (e) {
    console.error(e)
  }
}

export async function fetchShinigamiPages(chapterId: string): Promise<Chapter['pages']> {
  try {
    return await apiFetch<Chapter['pages']>(`/shinigami/chapter/${encodeURIComponent(chapterId)}/pages`)
  } catch (e) {
    console.error(e)
    return []
  }
}

// ---------------------------------------------------------------
// ADMIN WRITE API — fallback mock store saat backend offline
// ---------------------------------------------------------------
export async function listGenres(): Promise<Genre[]> {
  if (!(await isBackendOnline())) return [...mockStoreGenres]
  try {
    return await apiFetch<Genre[]>('/genres')
  } catch (e) {
    console.error(e)
    return [...mockStoreGenres]
  }
}

export async function listAuthors(): Promise<Author[]> {
  if (!(await isBackendOnline())) return [...mockStoreAuthors]
  try {
    return await apiFetch<Author[]>('/authors')
  } catch (e) {
    console.error(e)
    return [...mockStoreAuthors]
  }
}

export async function createGenre(name: string) {
  if (!(await isBackendOnline())) {
    mockEnsureGenres([name])
    return
  }
  try {
    await apiFetch('/genres', { method: 'POST', body: JSON.stringify({ name }) })
  } catch (e) {
    console.error(e)
    mockEnsureGenres([name])
  }
}

export async function deleteGenre(id: string) {
  if (!(await isBackendOnline())) return
  try {
    await apiFetch(`/genres/${id}`, { method: 'DELETE' })
  } catch (e) {
    console.error(e)
  }
}

export async function createAuthor(name: string, role: string) {
  if (!(await isBackendOnline())) {
    mockEnsureAuthors([name])
    return
  }
  try {
    await apiFetch('/authors', { method: 'POST', body: JSON.stringify({ name, role }) })
  } catch (e) {
    console.error(e)
    mockEnsureAuthors([name])
  }
}

export async function deleteAuthor(id: string) {
  if (!(await isBackendOnline())) return
  try {
    await apiFetch(`/authors/${id}`, { method: 'DELETE' })
  } catch (e) {
    console.error(e)
  }
}

export async function saveManga(input: MangaInput, id?: string): Promise<string | undefined> {
  if (!(await isBackendOnline())) {
    const m = id ? mockUpdateManga(id, input) : mockCreateManga(input)
    return id ?? m?.id
  }
  try {
    if (id) {
      await apiFetch(`/manga/${id}`, { method: 'PUT', body: JSON.stringify(input) })
      return id
    }
    const created = await apiFetch<{ id: string }>('/manga', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return created.id
  } catch (e) {
    console.error(e)
    const m = id ? mockUpdateManga(id, input) : mockCreateManga(input)
    return id ?? m?.id
  }
}

export async function removeManga(id: string): Promise<boolean> {
  if (!(await isBackendOnline())) return mockDeleteManga(id)
  try {
    await apiFetch(`/manga/${id}`, { method: 'DELETE' })
    return true
  } catch (e) {
    console.error(e)
    return mockDeleteManga(id)
  }
}

export async function saveChapter(
  mangaId: string,
  data: { id?: string; name: string; pages: Chapter['pages']; pdf_url?: string },
): Promise<void> {
  if (!(await isBackendOnline())) return
  try {
    if (data.id) {
      await apiFetch(`/chapters/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: data.name, pages: data.pages, pdf_url: data.pdf_url || null }),
      })
    } else {
      await apiFetch(`/manga/${mangaId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ name: data.name, pages: data.pages, pdf_url: data.pdf_url || null }),
      })
    }
  } catch (e) {
    console.error(e)
  }
}

export async function deleteChapter(id: string): Promise<void> {
  if (!(await isBackendOnline())) return
  try {
    await apiFetch(`/chapters/${id}`, { method: 'DELETE' })
  } catch (e) {
    console.error(e)
  }
}

export async function importShinigamiCatalog(): Promise<{ total: number; linked: number; imported: number }> {
  return apiFetch('/admin/shinigami/import', { method: 'POST' })
}

// ---------------------------------------------------------------
// HELPERS (mock fallback)
// ---------------------------------------------------------------
function mockHomeCollections(): HomeCollections {
  const byViews = [...storeManga].sort((a, b) => b.views_count - a.views_count)
  const byFollows = [...storeManga].sort((a, b) => b.follows_count - a.follows_count)
  return {
    updates: [...storeManga]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12),
    recommendation: {
      manhwa: storeManga.filter(m => m.type === 'manhwa').slice(0, 6),
      manga: storeManga.filter(m => m.type === 'manga').slice(0, 6),
      manhua: storeManga.filter(m => m.type === 'manhua').slice(0, 6),
    },
    popular: {
      daily: byViews.slice(0, 8),
      weekly: storeManga.slice(0, 8),
      all: byFollows.slice(0, 8),
    },
  }
}

function mockFilterManga(params?: { type?: string; search?: string; genre?: string }): Manga[] {
  let result = storeManga
  if (params?.type) result = result.filter(m => m.type === params.type)
  if (params?.genre) result = result.filter(m => m.genres.some(g => g.name === params.genre))
  if (params?.search) {
    const q = params.search.toLowerCase()
    result = result.filter(
      m =>
        m.title.toLowerCase().includes(q) ||
        m.original_name?.toLowerCase().includes(q) ||
        m.alternative_names.some(n => n.toLowerCase().includes(q)),
    )
  }
  return result
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
