export const queryKeys = {
  home: ['home-collections'] as const,
  announcements: ['announcements'] as const,
  banners: ['banners'] as const,
  mangaList: ['manga-list'] as const,
  genres: ['genres'] as const,
  manga: (slug: string) => ['manga', slug] as const,
  chapters: (mangaId: string) => ['chapters', mangaId] as const,
}
