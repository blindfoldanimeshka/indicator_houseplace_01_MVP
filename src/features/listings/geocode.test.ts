import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/env', () => ({
  getYandexMapsKey: vi.fn(),
}))

import { getYandexMapsKey } from '@/lib/env'
import { geocodeAddress } from '@/features/listings/geocode'

const originalFetch = globalThis.fetch

describe('geocodeAddress', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    globalThis.fetch = originalFetch
  })

  it('returns null when no API key is configured', async () => {
    vi.mocked(getYandexMapsKey).mockReturnValue(undefined)
    const result = await geocodeAddress('Москва, ул. Тверская, 13')
    expect(result).toBeNull()
  })

  it('parses coordinates from Yandex geocoder response', async () => {
    vi.mocked(getYandexMapsKey).mockReturnValue('test-key')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          GeoObjectCollection: {
            featureMember: [
              {
                GeoObject: {
                  metaDataProperty: {
                    GeocoderMetaData: { text: 'Москва, ул. Тверская, 13' },
                  },
                  Point: { pos: '37.612618 55.758748' },
                },
              },
            ],
          },
        },
      }),
    })

    const result = await geocodeAddress('Москва, ул. Тверская, 13')
    expect(result).toEqual({
      lat: 55.758748,
      lng: 37.612618,
      address: 'Москва, ул. Тверская, 13',
    })
    globalThis.fetch = originalFetch
  })

  it('returns null when geocoder returns no results', async () => {
    vi.mocked(getYandexMapsKey).mockReturnValue('test-key')
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: { GeoObjectCollection: { featureMember: [] } } }),
    })

    const result = await geocodeAddress('глухомань 999')
    expect(result).toBeNull()
    globalThis.fetch = originalFetch
  })

  it('returns null on network error', async () => {
    vi.mocked(getYandexMapsKey).mockReturnValue('test-key')
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'))
    const result = await geocodeAddress('Москва')
    expect(result).toBeNull()
    globalThis.fetch = originalFetch
  })
})
