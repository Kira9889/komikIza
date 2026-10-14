import { describe, expect, it } from 'vitest'
import { announcementSchema, bannerSchema, loginSchema, mangaInputSchema, registerSchema } from '../../server/validation.js'

describe('request validation schemas', () => {
  it('normalizes register email and username', () => {
    expect(registerSchema.parse({
      email: ' Reader@Gmail.com ',
      username: '  reader  ',
      password: 'secret123',
    })).toMatchObject({ email: 'reader@gmail.com', username: 'reader' })
  })

  it('rejects a non-Gmail registration', () => {
    expect(registerSchema.safeParse({ email: 'reader@example.com', username: 'reader', password: 'secret123' }).success).toBe(false)
  })

  it('accepts an existing admin email for login', () => {
    expect(loginSchema.parse({ email: 'admin@tenshi.id', password: 'a-strong-test-password' }).email).toBe('admin@tenshi.id')
  })

  it('trims announcement content and rejects an empty title', () => {
    expect(announcementSchema.parse({ title: '  Update  ', body: '  Isi  ' })).toEqual({
      title: 'Update',
      body: 'Isi',
      image_url: '',
    })
    expect(announcementSchema.safeParse({ title: '  ', body: '' }).success).toBe(false)
  })

  it('requires a valid manga type and status', () => {
    const result = mangaInputSchema.safeParse({ title: 'Judul', type: 'comic', status: 'Ongoing' })
    expect(result.success).toBe(false)
  })

  it('validates banner media type and requires an image', () => {
    expect(bannerSchema.parse({ image_url: ' https://cdn/x.gif ' })).toMatchObject({
      image_url: 'https://cdn/x.gif',
      media_type: 'image',
      manga_id: '',
      sort_order: 0,
    })
    expect(bannerSchema.safeParse({ image_url: 'https://cdn/x.mp4', media_type: 'audio' }).success).toBe(false)
    expect(bannerSchema.safeParse({ image_url: '' }).success).toBe(false)
  })
})
