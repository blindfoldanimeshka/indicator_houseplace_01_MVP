import { getSupabaseClient } from '@/lib/supabase'
import type { ListingFilters, ListingFormValues } from './types'

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
): Promise<ListingResult> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('listings')
    .insert({
      author_id: authorId,
      type: values.type,
      city: values.city,
      rooms: values.rooms,
      price: values.price,
      area: values.area ?? null,
      description: values.description,
      status: 'active',
    })
    .select()
    .single()

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

export async function listListings(
  filters: ListingFilters,
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<ListResult> {
  const supabase = getSupabaseClient()

  const baseQuery = supabase
    .from('listings')
    .select('*', { count: 'exact' })
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

  query = query
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await query

  return {
    data,
    error: error ? error.message : null,
    count: count ?? null,
  }
}
