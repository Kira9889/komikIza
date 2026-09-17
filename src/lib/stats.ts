import type { Manga } from '../types'

// Angka yang tampil ngikutin Shinigami bila sudah tersync (> 0),
// fallback ke counter lokal (bacaan/like di web ini) bila belum.
export function displayViews(m: Manga): number {
  return (m.shinigami_views ?? 0) > 0 ? (m.shinigami_views as number) : m.views_count
}

export function displayFollows(m: Manga): number {
  return (m.shinigami_bookmarks ?? 0) > 0 ? (m.shinigami_bookmarks as number) : m.follows_count
}

export function displayRating(m: Manga): number {
  return (m.shinigami_rating ?? 0) > 0 ? (m.shinigami_rating as number) : m.rating
}

/** True bila rating yang tampil berasal dari Shinigami (tanpa jumlah perating lokal). */
export function isShinigamiRating(m: Manga): boolean {
  return (m.shinigami_rating ?? 0) > 0
}
