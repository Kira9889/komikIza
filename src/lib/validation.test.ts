import { describe, expect, it } from 'vitest'
import { announcementSchema, loginSchema, mangaInputSchema, registerSchema } from '../../server/validation.js'

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
    expect(loginSchema.parse({ email: 'admin@tenshi.id', password: 'admin123' }).email).toBe('admin@tenshi.id')
  })

  it('trims announcement content and rejects an empty title', () => {
    expect(announcementSchema.parse({ title: '  Update  ', body: '  Isi  ' })).toEqual({ title: 'Update', body: 'Isi' })
    expect(announcementSchema.safeParse({ title: '  ', body: '' }).success).toBe(false)
  })

  it('requires a valid manga type and status', () => {
    const result = mangaInputSchema.safeParse({ title: 'Judul', type: 'comic', status: 'Ongoing' })
    expect(result.success).toBe(false)
  })
})
