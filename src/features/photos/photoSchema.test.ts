import { describe, expect, it } from 'vitest'
import { photoFileSchema, photoListSchema, MAX_BYTES, MAX_PHOTOS } from './photoSchema'

function png(): File {
  return new File(['x'], 'a.png', { type: 'image/png' })
}

describe('photoFileSchema', () => {
  it('accepts a valid PNG file', () => {
    expect(photoFileSchema.safeParse(png()).success).toBe(true)
  })

  it('rejects a GIF file', () => {
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })
    const result = photoFileSchema.safeParse(gif)
    expect(result.success).toBe(false)
  })

  it('rejects an oversize PNG', () => {
    const file = png()
    Object.defineProperty(file, 'size', { value: MAX_BYTES + 1 })
    const result = photoFileSchema.safeParse(file)
    expect(result.success).toBe(false)
  })
})

describe('photoListSchema', () => {
  it('accepts up to MAX_PHOTOS valid files', () => {
    const files = Array.from({ length: MAX_PHOTOS }, () => png())
    expect(photoListSchema.safeParse(files).success).toBe(true)
  })

  it('rejects more than MAX_PHOTOS valid files', () => {
    const files = Array.from({ length: MAX_PHOTOS + 1 }, () => png())
    expect(photoListSchema.safeParse(files).success).toBe(false)
  })
})
