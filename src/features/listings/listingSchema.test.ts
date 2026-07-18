import { describe, expect, it } from 'vitest'
import { listingFormSchema } from './types'

describe('listingFormSchema', () => {
  it('accepts a valid offer with all fields', () => {
    const values = {
      type: 'offer',
      city: 'Москва',
      rooms: '1',
      price: 50000,
      area: 40,
      description: 'Светлая квартира',
    }
    expect(listingFormSchema.safeParse(values).success).toBe(true)
  })

  it('rejects city shorter than 2 characters', () => {
    const result = listingFormSchema.safeParse({
      type: 'offer',
      city: 'М',
      rooms: '1',
      price: 50000,
      description: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects city longer than 100 characters', () => {
    const result = listingFormSchema.safeParse({
      type: 'offer',
      city: 'x'.repeat(101),
      rooms: '1',
      price: 50000,
      description: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects rooms not in the enum', () => {
    const result = listingFormSchema.safeParse({
      type: 'offer',
      city: 'Москва',
      rooms: '5',
      price: 50000,
      description: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects price below 1 and above 10_000_000', () => {
    expect(
      listingFormSchema.safeParse({
        type: 'offer',
        city: 'Москва',
        rooms: '1',
        price: 0,
        description: '',
      }).success,
    ).toBe(false)
    expect(
      listingFormSchema.safeParse({
        type: 'offer',
        city: 'Москва',
        rooms: '1',
        price: 10_000_001,
        description: '',
      }).success,
    ).toBe(false)
  })

  it('treats area as optional but validates bounds', () => {
    expect(
      listingFormSchema.safeParse({
        type: 'offer',
        city: 'Москва',
        rooms: '1',
        price: 50000,
        description: '',
      }).success,
    ).toBe(true)

    expect(
      listingFormSchema.safeParse({
        type: 'offer',
        city: 'Москва',
        rooms: '1',
        price: 50000,
        area: 0,
        description: '',
      }).success,
    ).toBe(false)

    expect(
      listingFormSchema.safeParse({
        type: 'offer',
        city: 'Москва',
        rooms: '1',
        price: 50000,
        area: 10_001,
        description: '',
      }).success,
    ).toBe(false)
  })

  it('rejects description longer than 2000 characters', () => {
    const result = listingFormSchema.safeParse({
      type: 'offer',
      city: 'Москва',
      rooms: '1',
      price: 50000,
      description: 'x'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown type', () => {
    const result = listingFormSchema.safeParse({
      type: 'other',
      city: 'Москва',
      rooms: '1',
      price: 50000,
      description: '',
    })
    expect(result.success).toBe(false)
  })
})
