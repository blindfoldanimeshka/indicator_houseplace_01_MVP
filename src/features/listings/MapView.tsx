import { useEffect, useRef, useState } from 'react'
import { getYandexMapsKey } from '@/lib/env'

const YMAPS_LOADER_URL = 'https://api-maps.yandex.ru/v3/?lang=ru_RU'
const SCRIPT_ID = 'ymaps3-loader'

let loadPromise: Promise<typeof window.ymaps3> | null = null

function loadYmaps3(apiKey: string): Promise<typeof window.ymaps3> {
  if (window.ymaps3) {
    return Promise.resolve(window.ymaps3)
  }
  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `${YMAPS_LOADER_URL}&apikey=${apiKey}`
    script.async = true
    script.onload = () => resolve(window.ymaps3)
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Не удалось загрузить Яндекс Карты'))
    }
    if (!existing) {
      document.head.appendChild(script)
    }
  })

  return loadPromise
}

export interface MapViewProps {
  lat: number | null
  lng: number | null
  address?: string
  height?: number
  selectable?: boolean
  onSelect?: (lat: number, lng: number) => void
}

export function MapView({
  lat,
  lng,
  address,
  height = 280,
  selectable = false,
  onSelect,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const apiKey = getYandexMapsKey()

  useEffect(() => {
    if (!apiKey) {
      setError('Карта недоступна: не задан VITE_YANDEX_MAPS_KEY')
      return
    }
    if (lat === null || lng === null) {
      setError('Точный адрес не указан — карта скрыта.')
      return
    }

    let cancelled = false
    let map: { destroy: () => void } | null = null

    loadYmaps3(apiKey)
      .then(async (ymaps3Module) => {
        if (cancelled || !containerRef.current || !ymaps3Module) return
        await ymaps3Module.ready

        const { YMap, YMapMarker } = ymaps3Module
        const mapInstance = new YMap(containerRef.current, {
          location: { center: [lng, lat], zoom: 15 },
        })

        const pin = document.createElement('div')
        pin.textContent = '📍'
        pin.style.fontSize = '28px'
        pin.style.cursor = selectable ? 'pointer' : 'default'

        const marker = new YMapMarker({ coordinates: [lng, lat] }, pin)
        mapInstance.addChild(marker)

        if (selectable && onSelect) {
          mapInstance.on('click', (event: { location: Array<[number, number]> }) => {
            const [lngClicked, latClicked] = event.location[0]
            onSelect(latClicked, lngClicked)
          })
        }

        map = mapInstance
        setReady(true)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
      map?.destroy()
    }
  }, [apiKey, lat, lng, selectable, onSelect])

  if (!apiKey) {
    return (
      <p className="text-sm text-muted-foreground">
        Карта отключена (нет ключа Yandex Maps).
      </p>
    )
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-2xl border border-border-muted bg-surface shadow-[var(--shadow-surface)]"
      aria-label={address ? `Карта: ${address}` : 'Карта объявления'}
      data-ready={ready}
    />
  )
}
