import { supabase } from '../lib/supabase';

export async function fetchListings(filters = {}) {
  let query = supabase
    .from('listings')
    .select('*, users!listings_author_id_fkey(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters.city) {
    const escaped = filters.city.replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.ilike('city', `%${escaped}%`);
  }
  if (filters.rooms && filters.rooms !== 'any') {
    query = query.eq('rooms', filters.rooms);
  }
  if (filters.maxPrice) {
    query = query.lte('price', Number(filters.maxPrice));
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorName: row.users?.name || 'Аноним',
    type: row.type,
    city: row.city,
    rooms: row.rooms,
    price: row.price,
    area: row.area,
    description: row.description,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function createListing({ userId, type, city, rooms, price, area, description }) {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      author_id: userId,
      type,
      city: city.trim(),
      rooms,
      price: Number(price),
      area: area ? Number(area) : null,
      description: (description || '').trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteListing(id) {
  const { error } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function fetchMyListings(userId) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('author_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    type: row.type,
    city: row.city,
    rooms: row.rooms,
    price: row.price,
    area: row.area,
    description: row.description,
    createdAt: new Date(row.created_at).getTime(),
  }));
}
