import { describe, expect, it } from 'vitest'
import { announcementSchema, bannerSchema, loginSchema, mangaInputSchema, registerSchema } from './validation.js'

describe('Express request schemas', () => {
  it('normalizes and validates registration fields', () => {
    expect(registerSchema.parse({ email: 'Reader@Gmail.com', username: ' reader ', password: 'secret1' }))
      .toMatchObject({ email: 'reader@gmail.com', username: 'reader' })
  })

  it('accepts the existing admin email for login', () => {
    expect(loginSchema.parse({ email: 'admin@tenshi.id', password: 'a-strong-test-password' }).email).toBe('admin@tenshi.id')
  })

  it('rejects invalid manga status and blank announcements', () => {
    expect(mangaInputSchema.safeParse({ title: 'Book', type: 'manga', status: 'Unknown' }).success).toBe(false)
    expect(announcementSchema.safeParse({ title: ' ', body: '' }).success).toBe(false)
  })

  it('validates banner media type and requires an image', () => {
    expect(bannerSchema.parse({ image_url: ' https://cdn/x.webp ' })).toMatchObject({
      image_url: 'https://cdn/x.webp',
      media_type: 'image',
      sort_order: 0,
    })
    expect(bannerSchema.safeParse({ image_url: 'https://cdn/x.mp4', media_type: 'audio' }).success).toBe(false)
    expect(bannerSchema.safeParse({ image_url: '' }).success).toBe(false)
  })
})
