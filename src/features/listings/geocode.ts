import { getYandexMapsKey } from '@/lib/env'

export interface GeocoderResult {
  lat: number
  lng: number
  address: string
}

interface YandexGeocodeResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          metaDataProperty?: {
            GeocoderMetaData?: { text?: string }
          }
          Point?: { pos?: string }
        }
      }>
    }
  }
}

export async function geocodeAddress(query: string): Promise<GeocoderResult | null> {
  const apiKey = getYandexMapsKey()
  if (!apiKey) {
    return null
  }

  const url = new URL('https://geocode-maps.yandex.ru/v1')
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('geocode', query)
  url.searchParams.set('lang', 'ru_RU')
  url.searchParams.set('format', 'json')
  url.searchParams.set('results', '1')

  let response: Response
  try {
    response = await fetch(url.toString())
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  let data: YandexGeocodeResponse
  try {
    data = (await response.json()) as YandexGeocodeResponse
  } catch {
    return null
  }

  const member = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject

  const pos = member?.Point?.pos
  if (!pos) {
    return null
  }

  const [lng, lat] = pos.split(' ').map(Number)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null
  }

  return {
    lat,
    lng,
    address: member?.metaDataProperty?.GeocoderMetaData?.text ?? query,
  }
}
