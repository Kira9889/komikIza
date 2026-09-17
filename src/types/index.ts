export type MangaType = 'manhwa' | 'manga' | 'manhua'

export type MangaStatus = 'Ongoing' | 'Completed' | 'Hiatus' | 'Dropped'

export interface Screen {
  id: string
  url: string
  label?: string
}

export interface Chapter {
  id: string
  manga_id: string
  name: string
  type: 'chapter' | 'special'
  sort_order: number
  release_timestamp: number
  pages: Screen[]
  /** URL preview PDF (mis. Google Drive /file/<id>/preview). Bila ada, reader menampilkan PDF alih-alih daftar gambar. */
  pdf_url?: string
  /** Chapter yang diambil langsung dari sumber eksternal. */
  source?: 'shinigami'
}

export interface Genre {
  id: string
  name: string
}

export interface Author {
  id: string
  name: string
  role?: 'author' | 'artist'
}

export interface Manga {
  id: string
  slug: string
  title: string
  original_name?: string
  type: MangaType
  status: MangaStatus
  description: string
  cover_url: string
  banner_url?: string
  /** ID seri dari Shinigami. Jika diisi, daftar chapter diambil live dengan fallback ke DB lokal. */
  shinigami_id?: string
  alternative_names: string[]
  views_count: number
  follows_count: number
  rating: number
  rating_count: number
  /** Statistik apa adanya dari Shinigami (diisi saat import katalog). */
  shinigami_views?: number
  shinigami_bookmarks?: number
  shinigami_rating?: number
  shinigami_rank?: number
  latest_chapter_number?: number
  latest_chapter_time?: string
  tags: string[]
  authors: Author[]
  genres: Genre[]
  release_date: string
  created_at: string
  latest_chapter?: Pick<Chapter, 'id' | 'name' | 'release_timestamp'>
}

export interface HomeCollections {
  updates: Manga[]
  recommendation: { manhwa: Manga[]; manga: Manga[]; manhua: Manga[] }
  popular: { daily: Manga[]; weekly: Manga[]; all: Manga[] }
  announcement?: { title: string; body: string }
}

export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  email_verified?: boolean
}

// ----------------------------------------------------------------
// Model untuk form CRUD admin (input buku baru / edit)
// ----------------------------------------------------------------
export interface MangaInput {
  title: string
  slug: string
  original_name?: string
  type: MangaType
  status: MangaStatus
  description: string
  cover_url: string
  banner_url?: string
  shinigami_id?: string
  alternative_names: string[]
  release_date: string
  tags: string[]
  genreNames: string[]
  authorNames: string[]
}
