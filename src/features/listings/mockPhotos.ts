import mock1 from '@/public/mock_1.jpg'
import mock2 from '@/public/mock_2.jpg'
import mock3 from '@/public/mock_3.jpg'
import mock4 from '@/public/mock_4.jpg'
import mock5 from '@/public/mock_5.jpg'

const MOCK_PHOTOS: string[] = [mock1, mock2, mock3, mock4, mock5]

/**
 * Returns a deterministic mock photo URL for a listing at the given index.
 * Mock listings have no Storage rows (no real upload), so we cycle the
 * bundled assets instead. Keeps the UI populated without touching Supabase Storage.
 */
export function getMockPhotoUrl(index: number): string {
  if (MOCK_PHOTOS.length === 0) return ''
  const safeIndex = Math.max(0, Math.floor(index))
  return MOCK_PHOTOS[safeIndex % MOCK_PHOTOS.length]
}

/**
 * Returns an array of mock photo URLs for carousel display.
 * Deterministic: always returns the same 3 URLs for a given listing index.
 */
export function getMockPhotoUrls(listingIndex: number): string[] {
  if (MOCK_PHOTOS.length === 0) return []
  const start = Math.abs(listingIndex) % MOCK_PHOTOS.length
  return [0, 1, 2].map((i) => MOCK_PHOTOS[(start + i) % MOCK_PHOTOS.length])
}

/** Total bundled mock photos available for rotation. */
export const MOCK_PHOTO_COUNT = MOCK_PHOTOS.length
