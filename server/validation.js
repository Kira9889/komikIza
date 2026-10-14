import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Email tidak valid').trim().toLowerCase(),
  password: z.string().min(1, 'Password wajib diisi').max(128, 'Password terlalu panjang'),
})

export const registerSchema = z.object({
  email: z.email('Email tidak valid').trim().toLowerCase().refine(
    email => /^[a-z0-9._%+-]+@(gmail|googlemail)\.com$/i.test(email),
    'Pendaftaran hanya untuk email @gmail.com',
  ),
  username: z.string().trim().min(3, 'Username minimal 3 karakter').max(24, 'Username maksimal 24 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter').max(128, 'Password terlalu panjang'),
})

export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(120, 'Judul maksimal 120 karakter'),
  body: z.string().trim().max(5000, 'Isi pengumuman maksimal 5000 karakter').default(''),
  image_url: z.string().trim().max(2048, 'URL terlalu panjang').default(''),
})

export const bannerSchema = z.object({
  title: z.string().trim().max(200, 'Judul maksimal 200 karakter').default(''),
  image_url: z.string().trim().min(1, 'Gambar/video wajib diisi').max(2048, 'URL terlalu panjang'),
  media_type: z.enum(['image', 'video']).default('image'),
  // Kosong = banner tidak menautkan ke judul mana pun (tombol baca disembunyikan).
  manga_id: z.union([z.uuid('ID manga tidak valid'), z.literal('')]).optional().default(''),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
})

export const mangaInputSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(200, 'Judul maksimal 200 karakter'),
  slug: z.string().trim().max(240, 'Slug maksimal 240 karakter').optional().default(''),
  original_name: z.string().max(300).optional().default(''),
  type: z.enum(['manhwa', 'manga', 'manhua']),
  status: z.enum(['Ongoing', 'Completed', 'Hiatus', 'Dropped']),
  description: z.string().max(10000).optional().default(''),
  cover_url: z.string().max(2048).optional().default(''),
  banner_url: z.string().max(2048).optional().default(''),
  shinigami_id: z.string().max(200).optional().default(''),
  alternative_names: z.array(z.string().max(300)).optional().default([]),
  release_date: z.string().max(30).optional().default(''),
  tags: z.array(z.string().max(120)).optional().default([]),
  genreNames: z.array(z.string().max(100)).optional().default([]),
  authorNames: z.array(z.string().max(200)).optional().default([]),
})
