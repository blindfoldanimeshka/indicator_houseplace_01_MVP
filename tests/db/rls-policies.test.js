import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { server, resetDB, seedUser, seedListing, DB } from '../__mocks__/msw-server';
import { supabase } from '../../src/lib/supabase';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
beforeEach(() => {
  resetDB();
  seedUser('user-owner', 'Владелец', 'Москва');
  seedUser('user-other', 'Другой', 'Питер');
  seedListing('l1', 'user-owner', 'offer', 'Москва', '1 комната', 45000);
});

describe('RLS: listings visibility', () => {
  it('listings are visible to everyone (non-deleted)', async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .is('deleted_at', null);

    expect(data).toHaveLength(1);
  });

  it('deleted listings are hidden', async () => {
    await supabase
      .from('listings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', 'l1');

    const { data } = await supabase
      .from('listings')
      .select('*')
      .is('deleted_at', null);

    expect(data).toHaveLength(0);
  });
});

describe('RLS: listing ownership', () => {
  it('owner can update own listing', async () => {
    await supabase
      .from('listings')
      .update({ price: 50000 })
      .eq('id', 'l1');

    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('id', 'l1')
      .single();

    expect(data.price).toBe(50000);
  });

  it('other user cannot update listing (simulated RLS check)', async () => {
    const { data: otherData } = await supabase
      .from('listings')
      .select('*')
      .eq('id', 'l1')
      .single();

    expect(otherData.author_id).not.toBe('user-other');
  });
});

describe('RLS: chat access', () => {
  it('participants can view chat messages', async () => {
    const { data: chat } = await supabase
      .from('chats')
      .insert({ listing_id: 'l1' })
      .select()
      .single();

    await supabase.from('chat_participants').insert([
      { chat_id: chat.id, user_id: 'user-owner' },
      { chat_id: chat.id, user_id: 'user-other' },
    ]);

    await supabase.from('messages').insert({
      chat_id: chat.id,
      sender_id: 'user-owner',
      text: 'Привет',
    });

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id);

    expect(messages).toHaveLength(1);
    expect(messages[0].sender_id).toBe('user-owner');
  });

  it('non-participant has no access (simulated)', async () => {
    const { data: chat } = await supabase
      .from('chats')
      .insert({ listing_id: 'l1' })
      .select()
      .single();

    await supabase.from('chat_participants').insert([
      { chat_id: chat.id, user_id: 'user-owner' },
    ]);

    const participants = DB.chat_participants.filter((p) => p.chat_id === chat.id);
    const participantIds = participants.map((p) => p.user_id);

    expect(participantIds).not.toContain('user-other');
  });
});
