import { getSupabaseClient } from '@/lib/supabase'
import type { ListingFilters, ListingFormValues } from './types'
import { trackEvent } from '@/features/analytics/trackEvent'

const PAGE_SIZE = 10

export interface ListingResult {
  data: unknown | null
  error: string | null
}

export interface ListResult {
  data: unknown[] | null
  error: string | null
  count: number | null
}

export async function createListing(
  values: ListingFormValues,
  authorId: string,
  orgId?: string | null,
): Promise<ListingResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .insert({
      author_id: authorId,
      org_id: orgId ?? null,
      type: values.type,
      city: values.city,
      rooms: values.rooms,
      price: values.price,
      area: values.area ?? null,
      description: values.description,
      address: values.address ?? '',
      lat: values.lat ?? null,
      lng: values.lng ?? null,
      status: 'active',
    })
    .select()
    .single()

  if (!error && data) {
    await trackEvent('create_listing', { listing_id: (data as { id: string }).id })
  }

  return { data, error: error ? error.message : null }
}

export async function updateListing(
  id: string,
  authorId: string,
  values: ListingFormValues,
): Promise<ListingResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .update({
      type: values.type,
      city: values.city,
      rooms: values.rooms,
      price: values.price,
      area: values.area ?? null,
      description: values.description,
      address: values.address ?? '',
      lat: values.lat ?? null,
      lng: values.lng ?? null,
    })
    .eq('id', id)
    .eq('author_id', authorId)
    .select()
    .single()

  return { data, error: error ? error.message : null }
}

export async function archiveListing(
  id: string,
  authorId: string,
): Promise<ListingResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', authorId)
    .select()
    .single()

  return { data, error: error ? error.message : null }
}

export async function getListing(id: string): Promise<ListingResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return { data, error: error ? error.message : null }
}

export async function boostListing(
  listingId: string,
): Promise<ListingResult> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('boost_listing', {
    p_listing_id: listingId,
  })
  if (error) return { data: null, error: error.message }
  await trackEvent('boost_listing', { listing_id: listingId })
  return { data: data as boolean, error: null }
}

export async function recordListingView(
  listingId: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('record_listing_view', {
    p_listing_id: listingId,
  })
  return { error: error ? error.message : null }
}

export async function recordListingResponse(
  listingId: string,
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('record_listing_response', {
    p_listing_id: listingId,
  })
  return { error: error ? error.message : null }
}

export async function listListings(
  filters: ListingFilters,
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<ListResult> {
  const supabase = getSupabaseClient()

  const sortPopular = filters.sort === 'popular'

  const baseQuery = supabase
    .from('listings')
    .select('*, listing_stats(views, responses)', { count: 'exact' })
    .eq('status', 'active')
    .is('deleted_at', null)

  type QueryBuilder = typeof baseQuery

  let query: QueryBuilder = baseQuery

  if (filters.type) {
    query = query.eq('type', filters.type)
  }
  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }
  if (filters.rooms) {
    query = query.eq('rooms', filters.rooms)
  }
  if (filters.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }

  if (sortPopular) {
    query = query
      .order('views', { ascending: false, foreignTable: 'listing_stats' })
      .order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await query

  return {
    data,
    error: error ? error.message : null,
    count: count ?? null,
  }
}
