import { getSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type ChatRow = Database['public']['Tables']['chats']['Row']
type MessageRow = Database['public']['Tables']['messages']['Row']

export interface ChatApiResult<T> {
  data: T | null
  error: string | null
}

export async function openOrCreateChat(
  listingId: string,
): Promise<ChatApiResult<string>> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('open_or_create_chat', {
    p_listing_id: listingId,
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as string, error: null }
}

export async function listMyChats(): Promise<
  ChatApiResult<
    {
      id: string
      listing_id: string
      created_at: string
      listings: { city: string; type: 'offer' | 'request' } | null
    }[]
  >
> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('chats')
    .select('id, listing_id, created_at, listings(city, type)')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as never, error: null }
}

export async function listMessages(
  chatId: string,
): Promise<ChatApiResult<MessageRow[]>> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as MessageRow[], error: null }
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
): Promise<ChatApiResult<MessageRow>> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: senderId, text })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as MessageRow, error: null }
}

type MessageInsert = Database['public']['Tables']['messages']['Row']

export function subscribeMessages(
  chatId: string,
  onInsert: (message: MessageInsert) => void,
): () => void {
  const supabase = getSupabaseClient()

  let pollTimer: ReturnType<typeof setInterval> | undefined
  let lastSeen: string | null = null

  const startPolling = () => {
    if (pollTimer) return
    const poll = async () => {
      const result = await listMessages(chatId)
      if (result.error || !result.data) return
      for (const message of result.data) {
        if (!lastSeen || message.created_at > lastSeen) {
          if (lastSeen) onInsert(message)
          lastSeen = lastSeen ? (message.created_at > lastSeen ? message.created_at : lastSeen) : message.created_at
        }
      }
    }
    pollTimer = setInterval(poll, 4000)
    void poll()
  }

  const channel = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        const message = payload.new as MessageInsert
        if (!lastSeen || message.created_at > lastSeen) {
          lastSeen = message.created_at
        }
        onInsert(message)
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // realtime active
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        startPolling()
      }
    })

  return () => {
    if (pollTimer) clearInterval(pollTimer)
    if (channel) supabase.removeChannel(channel)
  }
}

export type { ChatRow, MessageRow }
