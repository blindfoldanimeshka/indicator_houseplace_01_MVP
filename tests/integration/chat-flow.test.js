import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { server, resetDB, seedUser, seedListing, DB } from '../__mocks__/msw-server';
import { supabase } from '../../src/lib/supabase';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());
beforeEach(() => {
  resetDB();
  seedUser('user-1', 'Алиса', 'Москва');
  seedUser('user-2', 'Борис', 'Питер');
  seedListing('l1', 'user-1', 'offer', 'Москва', '1 комната', 45000);
});

describe('Chat flow (integration)', () => {
  it('create chat → add participants → send message → read thread', async () => {
    const { data: chat } = await supabase
      .from('chats')
      .insert({ listing_id: 'l1' })
      .select()
      .single();

    expect(chat).toBeDefined();
    expect(chat.listing_id).toBe('l1');

    await supabase.from('chat_participants').insert([
      { chat_id: chat.id, user_id: 'user-1' },
      { chat_id: chat.id, user_id: 'user-2' },
    ]);

    const { data: participants } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chat.id);

    expect(participants).toHaveLength(2);

    await supabase.from('messages').insert({
      chat_id: chat.id,
      sender_id: 'user-1',
      text: 'Здравствуйте! Квартира ещё доступна?',
    });

    await supabase.from('messages').insert({
      chat_id: chat.id,
      sender_id: 'user-2',
      text: 'Да, давайте обсудим детали',
    });

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });

    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe('Здравствуйте! Квартира ещё доступна?');
    expect(messages[1].text).toBe('Да, давайте обсудим детали');
  });

  it('openOrCreateChat is idempotent', async () => {
    const { data: chat1 } = await supabase
      .from('chats')
      .insert({ listing_id: 'l1' })
      .select()
      .single();

    await supabase.from('chat_participants').insert([
      { chat_id: chat1.id, user_id: 'user-1' },
      { chat_id: chat1.id, user_id: 'user-2' },
    ]);

    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .eq('listing_id', 'l1');

    expect(existing).toHaveLength(1);

    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', existing[0].id);

    const ids = participants.map((p) => p.user_id).sort();
    expect(ids).toEqual(['user-1', 'user-2']);
  });
});
