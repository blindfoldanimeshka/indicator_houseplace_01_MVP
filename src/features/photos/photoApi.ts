import { getSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { photoFileSchema, MAX_BYTES, MAX_PHOTOS } from './photoSchema'

export { MAX_BYTES, MAX_PHOTOS }

type PhotoRow = Database['public']['Tables']['listing_images']['Row']

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface PhotoApiResult<T> {
  data: T | null
  error: string | null
}

function extFromMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null
}

export async function uploadPhoto(
  listingId: string,
  file: File,
  sortOrder = 0,
): Promise<PhotoApiResult<{ id: string; path: string }>> {
  const parsed = photoFileSchema.safeParse(file)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Неверный файл.' }
  }

  const ext = extFromMime(file.type)
  if (!ext) {
    return { data: null, error: 'Неподдерживаемый тип файла.' }
  }

  const path = `listing/${listingId}/${crypto.randomUUID()}.${ext}`

  const supabase = getSupabaseClient()

  const uploadResult = await supabase.storage
    .from('listing-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadResult.error) {
    return { data: null, error: uploadResult.error.message }
  }

  const { data: row, error: insertError } = await supabase
    .from('listing_images')
    .insert({
      listing_id: listingId,
      path,
      mime_type: file.type,
      size_bytes: file.size,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (insertError) {
    return { data: null, error: insertError.message }
  }

  const created = row as PhotoRow

  return { data: { id: created.id, path: created.path }, error: null }
}

export async function listPhotos(
  listingId: string,
): Promise<PhotoApiResult<PhotoRow[]>> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('listing_images')
    .select('*')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: (data as PhotoRow[]) ?? [], error: null }
}

export function getPublicUrl(path: string): string {
  const supabase = getSupabaseClient()
  return supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl
}

export async function removePhoto(
  imageId: string,
  path: string,
): Promise<PhotoApiResult<true>> {
  const supabase = getSupabaseClient()

  const { error: removeError } = await supabase.storage
    .from('listing-photos')
    .remove([path])

  const { error: deleteError } = await supabase
    .from('listing_images')
    .delete()
    .eq('id', imageId)

  const error = removeError?.message ?? deleteError?.message ?? null

  return { data: error ? null : true, error }
}
