import { describe, expect, it } from 'vitest'
import { messageSchema, MAX_MESSAGE_LENGTH } from './chatSchema'

describe('messageSchema', () => {
  it('passes with non-empty text', () => {
    const result = messageSchema.safeParse({ text: 'привет' })
    expect(result.success).toBe(true)
  })

  it('fails on empty text', () => {
    const result = messageSchema.safeParse({ text: '' })
    expect(result.success).toBe(false)
  })

  it('fails on whitespace-only text', () => {
    const result = messageSchema.safeParse({ text: '   ' })
    expect(result.success).toBe(false)
  })

  it('fails when text exceeds 2000 characters', () => {
    const result = messageSchema.safeParse({ text: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) })
    expect(result.success).toBe(false)
  })

  it('passes when text is exactly 2000 characters', () => {
    const result = messageSchema.safeParse({ text: 'a'.repeat(MAX_MESSAGE_LENGTH) })
    expect(result.success).toBe(true)
  })
})
