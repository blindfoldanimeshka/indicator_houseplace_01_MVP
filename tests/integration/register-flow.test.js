import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { server, resetDB, seedUser } from '../__mocks__/msw-server';
import { supabase } from '../../src/lib/supabase';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
beforeEach(() => {
  resetDB();
  seedUser('user-test-1', 'Тестер', 'Москва');
});

describe('Register flow (integration)', () => {
  it('user appears in DB after registration via auth trigger simulation', async () => {
    const newUserId = 'user-new-1';
    seedUser(newUserId, 'Новый', 'Питер');

    const { data: users } = await supabase.from('users').select('*').eq('id', newUserId).single();

    expect(users).toBeDefined();
    expect(users.name).toBe('Новый');
    expect(users.city).toBe('Питер');
  });
});

describe('Login flow (integration)', () => {
  it('fetching profile returns correct user data', async () => {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'user-test-1')
      .single();

    expect(profile).toBeDefined();
    expect(profile.name).toBe('Тестер');
  });
});

describe('Profile update (integration)', () => {
  it('updates user name and city', async () => {
    await supabase
      .from('users')
      .update({ name: 'Обновлён', city: 'Казань' })
      .eq('id', 'user-test-1');

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'user-test-1')
      .single();

    expect(data.name).toBe('Обновлён');
    expect(data.city).toBe('Казань');
  });
});
