import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { server, resetDB, seedUser, seedListing } from '../__mocks__/msw-server';
import { supabase } from '../../src/lib/supabase';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
beforeEach(() => {
  resetDB();
  seedUser('u1', 'User', 'Москва');
  seedListing('l1', 'u1', 'offer', 'Москва', 'Студия', 30000);
  seedListing('l2', 'u1', 'offer', 'Питер', '1 комната', 45000);
  seedListing('l3', 'u1', 'request', 'Москва', '2 комнаты', 55000);
  seedListing('l4', 'u1', 'offer', 'Казань', '3 комнаты', 40000);
});

describe('Filter flow (integration)', () => {
  it('filters by type', async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('type', 'offer')
      .is('deleted_at', null);

    expect(data).toHaveLength(3);
    expect(data.every((l) => l.type === 'offer')).toBe(true);
  });

  it('filters by city (ILIKE)', async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .ilike('city', '%Москва%')
      .is('deleted_at', null);

    expect(data).toHaveLength(2);
    expect(data.every((l) => l.city === 'Москва')).toBe(true);
  });

  it('filters by max price', async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .lte('price', 40000)
      .is('deleted_at', null);

    expect(data).toHaveLength(2);
    expect(data.every((l) => l.price <= 40000)).toBe(true);
  });

  it('filters by type + city combined', async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('type', 'offer')
      .ilike('city', '%Москва%')
      .is('deleted_at', null);

    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('l1');
  });

  it('returns empty for non-matching filter', async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .ilike('city', '%Новосибирск%')
      .is('deleted_at', null);

    expect(data).toHaveLength(0);
  });
});
