import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { server, resetDB, seedUser, seedListing, DB } from '../__mocks__/msw-server';
import { supabase } from '../../src/lib/supabase';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
beforeEach(() => {
  resetDB();
  seedUser('user-1', 'Алиса', 'Москва');
  seedUser('user-2', 'Борис', 'Питер');
});

describe('Listing CRUD flow (integration)', () => {
  it('create → appears in feed → soft delete → disappears', async () => {
    const { data: created } = await supabase
      .from('listings')
      .insert({
        author_id: 'user-1',
        type: 'offer',
        city: 'Москва',
        rooms: '1 комната',
        price: 45000,
        area: 40,
        description: 'Уютная квартира',
      })
      .select()
      .single();

    expect(created).toBeDefined();
    expect(created.city).toBe('Москва');

    const { data: feed } = await supabase
      .from('listings')
      .select('*, users!listings_author_id_fkey(name)')
      .is('deleted_at', null);

    expect(feed).toHaveLength(1);
    expect(feed[0].users.name).toBe('Алиса');

    await supabase
      .from('listings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', created.id);

    const { data: afterDelete } = await supabase
      .from('listings')
      .select('*')
      .is('deleted_at', null);

    expect(afterDelete).toHaveLength(0);
  });

  it('fetchMyListings returns only user own listings', async () => {
    seedListing('l1', 'user-1', 'offer', 'Москва', 'Студия', 30000);
    seedListing('l2', 'user-2', 'request', 'Питер', '2 комнаты', 40000);

    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('author_id', 'user-1')
      .is('deleted_at', null);

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('l1');
  });
});
