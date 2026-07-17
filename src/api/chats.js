import { supabase } from '../lib/supabase';

export async function fetchChats(userId) {
  const { data: participations, error: pErr } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId);

  if (pErr) throw pErr;
  if (!participations.length) return [];

  const chatIds = participations.map((p) => p.chat_id);

  const { data: chats, error: cErr } = await supabase
    .from('chats')
    .select('id, listing_id, created_at')
    .in('id', chatIds);

  if (cErr) throw cErr;

  const allParticipantRows = await supabase
    .from('chat_participants')
    .select('chat_id, user_id, users(name)')
    .in('chat_id', chatIds);

  const participantMapByChat = {};
  allParticipantRows.data?.forEach((p) => {
    if (!participantMapByChat[p.chat_id]) participantMapByChat[p.chat_id] = {};
    participantMapByChat[p.chat_id][p.user_id] = p.users?.name || 'Аноним';
  });

  const allMessages = await supabase
    .from('messages')
    .select('chat_id, sender_id, sender:users!messages_sender_id_fkey(name), text, created_at')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: true });

  const messagesByChat = {};
  allMessages.data?.forEach((m) => {
    if (!messagesByChat[m.chat_id]) messagesByChat[m.chat_id] = [];
    messagesByChat[m.chat_id].push({
      senderId: m.sender_id,
      senderName: m.sender?.name || 'Аноним',
      text: m.text,
      ts: new Date(m.created_at).getTime(),
    });
  });

  const listingIds = [...new Set(chats.map((c) => c.listing_id))];
  const allListings = await supabase
    .from('listings')
    .select('id, type, rooms, city, price')
    .in('id', listingIds);

  const listingMap = {};
  allListings.data?.forEach((l) => { listingMap[l.id] = l; });

  const results = [];
  for (const chat of chats) {
    const messages = messagesByChat[chat.id] || [];
    if (!messages.length) continue;

    const listing = listingMap[chat.listing_id];
    const listingSummary = listing
      ? `${listing.type === 'offer' ? 'Сдаётся' : 'Ищут'} · ${listing.rooms} · ${listing.city} · ${Number(listing.price).toLocaleString('ru-RU')} ₽/мес`
      : 'Объявление удалено';

    results.push({
      chatId: chat.id,
      listingId: chat.listing_id,
      listingSummary,
      participants: participantMapByChat[chat.id] || {},
      messages,
    });
  }

  results.sort((a, b) => {
    const aLast = a.messages[a.messages.length - 1]?.ts || 0;
    const bLast = b.messages[b.messages.length - 1]?.ts || 0;
    return bLast - aLast;
  });

  return results;
}

export async function openOrCreateChat({ listingId, listingSummary, userId, otherUserId }) {
  const { data: existingChats } = await supabase
    .from('chats')
    .select('id')
    .eq('listing_id', listingId);

  if (existingChats) {
    for (const chat of existingChats) {
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chat.id);

      const ids = participants?.map((p) => p.user_id).sort() || [];
      if (ids.includes(userId) && ids.includes(otherUserId)) {
        return chat.id;
      }
    }
  }

  const { data: chat, error: cErr } = await supabase
    .from('chats')
    .insert({ listing_id: listingId })
    .select()
    .single();

  if (cErr) throw cErr;

  const { error: pErr } = await supabase.from('chat_participants').insert([
    { chat_id: chat.id, user_id: userId },
    { chat_id: chat.id, user_id: otherUserId },
  ]);

  if (pErr) throw pErr;

  return chat.id;
}

export async function fetchThread(chatId) {
  const { data: participants } = await supabase
    .from('chat_participants')
    .select('user_id, users(name)')
    .eq('chat_id', chatId);

  const participantMap = {};
  participants?.forEach((p) => {
    participantMap[p.user_id] = p.users?.name || 'Аноним';
  });

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, sender_id, sender:users!messages_sender_id_fkey(name), text, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const { data: chat } = await supabase
    .from('chats')
    .select('listing_id')
    .eq('id', chatId)
    .single();

  let listingSummary = 'Объявление удалено';
  if (chat) {
    const { data: listing } = await supabase
      .from('listings')
      .select('type, rooms, city, price')
      .eq('id', chat.listing_id)
      .single();
    if (listing) {
      listingSummary = `${listing.type === 'offer' ? 'Сдаётся' : 'Ищут'} · ${listing.rooms} · ${listing.city} · ${Number(listing.price).toLocaleString('ru-RU')} ₽/мес`;
    }
  }

  return {
    chatId,
    listingSummary,
    participants: participantMap,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender?.name || 'Аноним',
      text: m.text,
      ts: new Date(m.created_at).getTime(),
    })),
  };
}

export async function sendMessage({ chatId, senderId, text }) {
  const { error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: senderId, text: text.trim() });

  if (error) throw error;
}

export function subscribeToChat(chatId, onMessage) {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      async (payload) => {
        const { data: sender } = await supabase
          .from('users')
          .select('name')
          .eq('id', payload.new.sender_id)
          .single();

        onMessage({
          id: payload.new.id,
          senderId: payload.new.sender_id,
          senderName: sender?.name || 'Аноним',
          text: payload.new.text,
          ts: new Date(payload.new.created_at).getTime(),
        });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
