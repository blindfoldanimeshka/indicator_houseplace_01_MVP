import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
import type { Database } from '@/types/database'

type MessageRow = Database['public']['Tables']['messages']['Row']

export interface UnreadNotification {
  chatId: string
  messageId: string
  text: string
  senderId: string
  createdAt: string
}

export interface UnreadState {
  total: number
  byChat: Record<string, number>
  recent: UnreadNotification[]
}

const EMPTY: UnreadState = { total: 0, byChat: {}, recent: [] }

export function useUnreadCounts() {
  const { user } = useAuth()
  const [state, setState] = useState<UnreadState>(EMPTY)
  // chatIds участника — чтобы фильтровать incoming сообщения "моих" чатов.
  const myChats = useRef<Set<string>>(new Set())

  const markChatRead = useCallback((chatId: string) => {
    setState((prev) => {
      const count = prev.byChat[chatId] ?? 0
      if (count === 0 && prev.recent.every((n) => n.chatId !== chatId)) {
        return prev
      }
      const byChat = { ...prev.byChat }
      delete byChat[chatId]
      const recent = prev.recent.filter((n) => n.chatId !== chatId)
      return {
        byChat,
        recent,
        total: Object.values(byChat).reduce((a, b) => a + b, 0),
      }
    })
  }, [])

  const setMyChats = useCallback((ids: string[]) => {
    myChats.current = new Set(ids)
  }, [])

  useEffect(() => {
    if (!user) {
      setState(EMPTY)
      return
    }

    const supabase = getSupabaseClient()

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const message = payload.new as MessageRow
          if (message.sender_id === user.id) return
          if (!myChats.current.has(message.chat_id)) return

          setState((prev) => {
            const byChat = {
              ...prev.byChat,
              [message.chat_id]: (prev.byChat[message.chat_id] ?? 0) + 1,
            }
            const recent: UnreadNotification[] = [
              {
                chatId: message.chat_id,
                messageId: message.id,
                text: message.text,
                senderId: message.sender_id,
                createdAt: message.created_at,
              },
              ...prev.recent,
            ].slice(0, 10)
            return {
              byChat,
              recent,
              total: Object.values(byChat).reduce((a, b) => a + b, 0),
            }
          })
        },
      )
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [user])

  return { ...state, markChatRead, setMyChats }
}
