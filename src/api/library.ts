import { apiFetch, isBackendOnline } from '../lib/api'
import { compressImageToWebp } from '../lib/imageCompress'
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
import type { Manga, Genre, Author, Chapter, Comment, AdminComment, Announcement, Banner, BannerInput, GifItem, HomeCollections, MangaInput } from '../types'

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
  // Pagination server-side: kirim limit supaya payload list tetap kecil
  // (NavbarSearch hanya butuh beberapa baris, bukan seluruh katalog).
  limit?: number
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
  if (params?.limit) query.limit = String(params.limit)
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
    // 404 = benar-benar tidak ada. Error lain (timeout / 5xx / rate limit)
    // JANGAN diubah jadi null: React Query akan menganggapnya sukses dan
    // menyimpan null di cache, sehingga halaman reader nyangkut.
    if (e.status === 404) return null
    throw e
  }
}

export async function fetchChapters(mangaId: string, opts?: { slim?: boolean }): Promise<Chapter[]> {
  if (!(await isBackendOnline())) {
    await delay(200)
    return getChaptersCached(mangaId)
  }
  // Daftar default slim (tanpa blob pages) — hanya admin yang butuh blob
  // detail memintanya lewat fetchChapterWithPages 1 chapter sekaligus.
  if (opts?.slim === false) {
    return apiFetch<Chapter[]>(`/manga/${mangaId}/chapters`, { query: { include_pages: '1' } })
  }
  try {
    return await apiFetch<Chapter[]>(`/manga/${mangaId}/chapters`, { query: { slim: '1' } })
  } catch (e) {
    console.error(e)
    // Lempar ke React Query supaya status error terlihat & bisa di-retry.
    // Kalau ditelan lalu diganti mock kosong, halaman reader mengira daftar
    // chapter sudah termuat (padahal kosong) dan berhenti di "Memuat chapter…".
    throw e
  }
}

// Blob pages SATU chapter (untuk form edit admin) — server kirim via
// ?chapter_id= tanpa usah menyeret pages seluruh daftar.
export async function fetchChapterWithPages(mangaId: string, chapterId: string): Promise<Chapter | undefined> {
  try {
    const rows = await apiFetch<Chapter[]>(`/manga/${mangaId}/chapters`, {
      query: { chapter_id: chapterId },
    })
    return Array.isArray(rows) ? rows[0] : undefined
  } catch (e) {
    console.error(e)
    return undefined
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
  // Biarkan error naik ke pemanggil (reader) agar bisa menampilkan tombol
  // "Coba lagi". Dulu error ditelan jadi [] sehingga chapter tampak kosong.
  return apiFetch<Chapter['pages']>(`/shinigami/chapter/${encodeURIComponent(chapterId)}/pages`)
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
  if (!(await isBackendOnline())) throw new Error('Server tidak merespons. Coba lagi sebentar lagi.')
  // Sengaja TIDAK di-catch: pemanggil (Admin) menampilkan error ke user
  // (mis. nama chapter ganda). Menelan error bikin user klik Simpan berulang.
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
}

// ---------------------------------------------------------------
// KOMENTAR (baca publik, tulis harus login)
// ---------------------------------------------------------------
export async function fetchComments(mangaId: string, chapterId?: string): Promise<Comment[]> {
  if (!(await isBackendOnline())) return []
  try {
    return await apiFetch<Comment[]>(`/manga/${mangaId}/comments`, {
      query: chapterId ? { chapter_id: chapterId } : undefined,
    })
  } catch (e) {
    console.error(e)
    return []
  }
}

export async function postComment(mangaId: string, body: string, chapterId?: string, parentId?: string): Promise<Comment> {
  return apiFetch<Comment>(`/manga/${mangaId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, chapter_id: chapterId ?? null, parent_id: parentId ?? null }),
  })
}

export async function searchGifs(q: string): Promise<GifItem[]> {
  return apiFetch<GifItem[]>('/gifs/search', { query: { q } })
}

export async function uploadCommentImage(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran maksimal 2MB')
  if (!/^(image\/jpeg|image\/png|image\/webp|image\/gif)$/.test(file.type)) {
    throw new Error('Format harus JPG, PNG, WebP, atau GIF')
  }
  // Kompres → WebP <= 200KB dulu supaya egress storage tidak terkuras.
  const compressed = await compressImageToWebp(file, { maxKB: 200, keepGif: true })
  const fd = new FormData()
  fd.append('image', compressed)
  const res = await apiFetch<{ url: string }>('/me/comment-image', { method: 'POST', body: fd })
  return res.url
}

export async function deleteComment(id: string): Promise<void> {
  await apiFetch(`/comments/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------
// PENGUMUMAN (baca publik, tulis admin)
// ---------------------------------------------------------------
export async function fetchAnnouncements(): Promise<Announcement[] | null> {
  if (!(await isBackendOnline())) return null
  try {
    return await apiFetch<Announcement[]>('/announcements')
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function fetchAnnouncementById(id: string): Promise<Announcement | null> {
  if (!(await isBackendOnline())) return null
  try {
    return await apiFetch<Announcement>(`/announcements/${encodeURIComponent(id)}`)
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function saveAnnouncement(input: { id?: string; title: string; body: string; image_url: string }): Promise<void> {
  const body = JSON.stringify({ title: input.title, body: input.body, image_url: input.image_url })
  if (input.id) {
    await apiFetch(`/announcements/${input.id}`, { method: 'PUT', body })
  } else {
    await apiFetch('/announcements', { method: 'POST', body })
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await apiFetch(`/announcements/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------
// BANNER HOME (baca publik, tulis admin)
// ---------------------------------------------------------------
export async function fetchBanners(): Promise<Banner[] | null> {
  if (!(await isBackendOnline())) return null
  try {
    return await apiFetch<Banner[]>('/banners')
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function saveBanner(input: BannerInput & { id?: string }): Promise<void> {
  const body = JSON.stringify(input)
  if (input.id) {
    await apiFetch(`/banners/${input.id}`, { method: 'PUT', body })
  } else {
    await apiFetch('/banners', { method: 'POST', body })
  }
}

export async function deleteBanner(id: string): Promise<void> {
  await apiFetch(`/banners/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------
// MODERASI KOMENTAR (admin)
// ---------------------------------------------------------------
export async function fetchAllComments(): Promise<AdminComment[]> {
  return apiFetch<AdminComment[]>('/admin/comments')
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
      daily: byViews.slice(0, 10),
      weekly: storeManga.slice(0, 10),
      all: byFollows.slice(0, 10),
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
