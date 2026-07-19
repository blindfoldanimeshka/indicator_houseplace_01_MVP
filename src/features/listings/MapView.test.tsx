import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/env', () => ({
  getYandexMapsKey: vi.fn(),
  isSupabaseConfigured: () => true,
  getSupabaseEnvironment: () => ({
    VITE_SUPABASE_URL: 'https://x.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'k',
  }),
}))

import { getYandexMapsKey } from '@/lib/env'
import { MapView } from '@/features/listings/MapView'

describe('MapView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    window.ymaps3 = undefined
    document.head
      .querySelectorAll('script[id="ymaps3-loader"]')
      .forEach((el) => el.remove())
  })

  it('shows disabled notice when no API key', () => {
    vi.mocked(getYandexMapsKey).mockReturnValue(undefined)
    render(<MapView lat={55.75} lng={37.61} />)
    expect(screen.getByText(/Карта отключена/i)).toBeInTheDocument()
  })

  it('shows hidden notice when coordinates are missing', () => {
    vi.mocked(getYandexMapsKey).mockReturnValue('test-key')
    render(<MapView lat={null} lng={null} />)
    expect(screen.getByText(/Точный адрес не указан/i)).toBeInTheDocument()
  })

  it('renders a map container when key and coords present', async () => {
    vi.mocked(getYandexMapsKey).mockReturnValue('test-key')

    const destroy = vi.fn()
    const addChild = vi.fn()
    const on = vi.fn()
    const YMap = vi.fn().mockImplementation(function () {
      return { destroy, addChild, on }
    })
    const YMapMarker = vi.fn().mockImplementation(function () {
      return {}
    })

    window.ymaps3 = {
      ready: Promise.resolve(),
      YMap,
      YMapMarker,
    } as unknown as typeof window.ymaps3

    render(<MapView lat={55.75} lng={37.61} address="Тверская 13" height={200} />)

    await waitFor(() => {
      expect(YMap).toHaveBeenCalled()
    })
    expect(YMapMarker).toHaveBeenCalledWith(
      { coordinates: [37.61, 55.75] },
      expect.anything(),
    )
    expect(addChild).toHaveBeenCalled()
    expect(screen.getByLabelText(/Карта: Тверская 13/i)).toBeInTheDocument()
  })
})
