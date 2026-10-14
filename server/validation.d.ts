import { z } from 'zod'

export declare const loginSchema: z.ZodType<{ email: string; password: string }>
export declare const registerSchema: z.ZodType<{ email: string; username: string; password: string }>
export declare const announcementSchema: z.ZodType<{ title: string; body: string; image_url: string }>
export declare const bannerSchema: z.ZodType<{
  title: string
  image_url: string
  media_type: 'image' | 'video'
  manga_id: string
  sort_order: number
}>
export declare const mangaInputSchema: z.ZodType<{
  title: string
  slug: string
  original_name: string
  type: 'manhwa' | 'manga' | 'manhua'
  status: 'Ongoing' | 'Completed' | 'Hiatus' | 'Dropped'
  description: string
  cover_url: string
  banner_url: string
  shinigami_id: string
  alternative_names: string[]
  release_date: string
  tags: string[]
  genreNames: string[]
  authorNames: string[]
}>
