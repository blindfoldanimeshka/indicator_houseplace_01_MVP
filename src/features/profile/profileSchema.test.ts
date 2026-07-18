import { describe, expect, it } from 'vitest'
import { authSchema, profileSchema } from '@/features/profile/profileSchema'

describe('profileSchema', () => {
  it('accepts valid name and city', () => {
    expect(profileSchema.safeParse({ name: 'Иван', city: 'Москва' }).success).toBe(
      true,
    )
  })

  it('accepts empty optional city', () => {
    expect(profileSchema.safeParse({ name: 'Иван', city: '' }).success).toBe(true)
  })

  it('rejects name longer than 100 characters', () => {
    expect(profileSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })

  it('rejects city longer than 100 characters', () => {
    expect(
      profileSchema.safeParse({ name: 'Иван', city: 'a'.repeat(101) }).success,
    ).toBe(false)
  })

  it('rejects empty name', () => {
    expect(profileSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

describe('authSchema', () => {
  it('rejects invalid email', () => {
    expect(
      authSchema.safeParse({ email: 'not-an-email', password: 'password1', name: 'Иван', city: '' })
        .success,
    ).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    expect(
      authSchema.safeParse({ email: 'a@b.com', password: 'short', name: 'Иван', city: '' })
        .success,
    ).toBe(false)
  })

  it('accepts a complete valid payload', () => {
    expect(
      authSchema.safeParse({ email: 'a@b.com', password: 'password1', name: 'Иван', city: 'Москва' })
        .success,
    ).toBe(true)
  })
})
