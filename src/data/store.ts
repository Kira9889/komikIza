import { genres as seedGenres, authors as seedAuthors, seedManga, buildSeedChapters } from './seed'
import type { Manga, Genre, Author, Chapter, MangaInput } from '../types'

// ---------------------------------------------------------------
// In-memory store (fallback saat backend belum berjalan).
// Data dimulai dari seed lalu dapat dimutasi oleh admin CRUD.
// ---------------------------------------------------------------

export const storeGenres: Genre[] = [...seedGenres]
export const storeAuthors: Author[] = [...seedAuthors]
export const storeManga: Manga[] = [...seedManga]
const chapterCache = new Map<string, Chapter[]>()

export function ensureGenres(names: string[]): Genre[] {
  const result: Genre[] = []
  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed) continue
    let g = storeGenres.find(x => x.name.toLowerCase() === trimmed.toLowerCase())
    if (!g) {
      g = { id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: trimmed }
      storeGenres.push(g)
    }
    result.push(g)
  }
  return result
}

export function ensureAuthors(names: string[]): Author[] {
  const result: Author[] = []
  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed) continue
    let a = storeAuthors.find(x => x.name.toLowerCase() === trimmed.toLowerCase())
    if (!a) {
      a = { id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: trimmed, role: 'author' }
      storeAuthors.push(a)
    }
    result.push(a)
  }
  return result
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function createManga(input: MangaInput): Manga {
  const genres = ensureGenres(input.genreNames)
  const authors = ensureAuthors(input.authorNames)
  const now = new Date().toISOString()
  const manga: Manga = {
    id: `m-${Date.now()}`,
    slug: slugify(input.slug || input.title),
    title: input.title,
    original_name: input.original_name || undefined,
    type: input.type,
    status: input.status,
    description: input.description,
    cover_url: input.cover_url || `https://placehold.co/300x400/1a1a2e/6f39ee?text=${encodeURIComponent(input.title || 'Manga')}`,
    banner_url: input.banner_url || undefined,
    alternative_names: input.alternative_names.map(s => s.trim()).filter(Boolean),
    views_count: 0,
    follows_count: 0,
    rating: 0,
    rating_count: 0,
    tags: input.tags.map(s => s.trim()).filter(Boolean),
    authors,
    genres,
    release_date: input.release_date || now.slice(0, 10),
    created_at: now,
  }
  storeManga.push(manga)
  return manga
}

export function updateManga(id: string, input: MangaInput): Manga | null {
  const idx = storeManga.findIndex(m => m.id === id)
  if (idx < 0) return null
  const existing = storeManga[idx]
  const updated: Manga = {
    ...existing,
    title: input.title,
    slug: slugify(input.slug || input.title),
    original_name: input.original_name || undefined,
    type: input.type,
    status: input.status,
    description: input.description,
    cover_url: input.cover_url,
    banner_url: input.banner_url || undefined,
    alternative_names: input.alternative_names.map(s => s.trim()).filter(Boolean),
    release_date: input.release_date,
    tags: input.tags.map(s => s.trim()).filter(Boolean),
    genres: ensureGenres(input.genreNames),
    authors: ensureAuthors(input.authorNames),
  }
  storeManga[idx] = updated
  return updated
}

export function deleteManga(id: string): boolean {
  const before = storeManga.length
  const idx = storeManga.findIndex(m => m.id === id)
  if (idx >= 0) storeManga.splice(idx, 1)
  chapterCache.delete(id)
  return storeManga.length < before
}

export function getManga(id: string): Manga | undefined {
  return storeManga.find(m => m.id === id)
}

export function getChaptersCached(mangaId: string): Chapter[] {
  let list = chapterCache.get(mangaId)
  if (!list) {
    list = buildSeedChapters(mangaId).sort((a, b) => a.sort_order - b.sort_order)
    chapterCache.set(mangaId, list)
  }
  return list
}
