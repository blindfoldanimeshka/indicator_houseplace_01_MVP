import { getSupabaseClient } from '@/lib/supabase'

export const storageBuckets = {
  avatars: 'avatars',
  listingPhotos: 'listing-photos',
} as const

/**
 * Strips a single leading bucket prefix if present.
 * - 'avatars/user-id' -> 'user-id'
 * - 'listing-photos/listing/uuid.jpg' -> 'listing/uuid.jpg'
 * - 'user-id' -> 'user-id' (no prefix, returned as-is)
 */
export function objectName(path: string | null | undefined): string | null | undefined {
  if (!path) return path
  if (path.startsWith(`${storageBuckets.avatars}/`)) {
    return path.slice(storageBuckets.avatars.length + 1)
  }
  if (path.startsWith(`${storageBuckets.listingPhotos}/`)) {
    return path.slice(storageBuckets.listingPhotos.length + 1)
  }
  return path
}

export function getAvatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const name = objectName(path)
  if (!name) return null
  const { data } = getSupabaseClient()
    .storage.from(storageBuckets.avatars)
    .getPublicUrl(name)
  return data.publicUrl
}

export function getListingPhotoUrl(path: string): string {
  const name = objectName(path)
  if (!name) return ''
  const { data } = getSupabaseClient()
    .storage.from(storageBuckets.listingPhotos)
    .getPublicUrl(name)
  return data.publicUrl
}

export async function removeAvatar(userId: string) {
  return getSupabaseClient().storage.from(storageBuckets.avatars).remove([userId])
}

export async function removeListingPhoto(path: string) {
  const name = objectName(path)
  if (!name) return { data: null, error: 'Invalid path' }
  return getSupabaseClient()
    .storage.from(storageBuckets.listingPhotos)
    .remove([name])
}