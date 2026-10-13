import { describe, expect, it } from 'vitest'
import { announcementSchema, loginSchema, mangaInputSchema, registerSchema } from './validation.js'

describe('Express request schemas', () => {
  it('normalizes and validates registration fields', () => {
    expect(registerSchema.parse({ email: 'Reader@Gmail.com', username: ' reader ', password: 'secret1' }))
      .toMatchObject({ email: 'reader@gmail.com', username: 'reader' })
  })

  it('accepts the existing admin email for login', () => {
    expect(loginSchema.parse({ email: 'admin@tenshi.id', password: 'admin123' }).email).toBe('admin@tenshi.id')
  })

  it('rejects invalid manga status and blank announcements', () => {
    expect(mangaInputSchema.safeParse({ title: 'Book', type: 'manga', status: 'Unknown' }).success).toBe(false)
    expect(announcementSchema.safeParse({ title: ' ', body: '' }).success).toBe(false)
  })
})
