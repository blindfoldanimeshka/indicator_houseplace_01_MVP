import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { listMyChats } from './chatApi'
import type { UnreadState } from './useUnreadCounts'

interface ChatSummary {
  id: string
  listing_id: string
  created_at: string
  listings: { city: string; type: 'offer' | 'request' } | null
}

interface ChatListProps {
  onOpen: (chatId: string) => void
  unread?: UnreadState
  onChatsResolved?: (ids: string[]) => void
}

const TYPE_LABELS: Record<'offer' | 'request', string> = {
  offer: 'Сдаётся',
  request: 'Ищу',
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

export function ChatList({ onOpen, unread, onChatsResolved }: ChatListProps) {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    let active = true
    setLoading(true)
    setError(null)

    listMyChats().then((result) => {
      if (!active) return
      const err: unknown = result.error
      if (err) {
        setError(
          typeof err === 'string'
            ? err
            : (err as { message: string }).message,
        )
        setChats([])
      } else {
        setChats(result.data ?? [])
        onChatsResolved?.(result.data?.map((c) => c.id) ?? [])
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [onChatsResolved])

  useEffect(() => {
    const cancel = refresh()
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel('chat-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats' },
        () => refresh(),
      )
      .subscribe()

    return () => {
      cancel()
      if (channel) supabase.removeChannel(channel)
    }
  }, [refresh])

  if (loading) {
    return <p className="text-sm text-stone-600">Загрузка…</p>
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
        {error}
      </p>
    )
  }

  if (chats.length === 0) {
    return (
      <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-600">
        У вас пока нет диалогов.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {chats.map((chat) => (
        <li key={chat.id}>
          <button
            type="button"
            onClick={() => onOpen(chat.id)}
            className="flex w-full flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-teal-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-950">
                {chat.listings?.city ?? 'Объявление'}
              </span>
              {chat.listings && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    chat.listings.type === 'offer'
                      ? 'bg-teal-100 text-teal-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {TYPE_LABELS[chat.listings.type]}
                </span>
              )}
            </div>
              <span className="text-xs text-stone-500">
                {formatDate(chat.created_at)}
              </span>
              {unread && (unread.byChat[chat.id] ?? 0) > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                  {unread.byChat[chat.id]}
                </span>
              )}
          </button>
        </li>
      ))}
    </ul>
  )
}
