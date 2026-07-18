import { useEffect, useState } from 'react'
import { listMyChats } from './chatApi'

interface ChatSummary {
  id: string
  listing_id: string
  created_at: string
  listings: { city: string; type: 'offer' | 'request' } | null
}

interface ChatListProps {
  onOpen: (chatId: string) => void
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

export function ChatList({ onOpen }: ChatListProps) {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

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
          </button>
        </li>
      ))}
    </ul>
  )
}
