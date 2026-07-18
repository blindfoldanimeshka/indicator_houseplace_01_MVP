import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { listMessages, sendMessage, subscribeMessages } from './chatApi'
import { messageSchema, MAX_MESSAGE_LENGTH } from './chatSchema'
import { ReportButton } from '@/features/reports/ReportButton'
import type { MessageRow } from './chatApi'

interface ThreadProps {
  chatId: string
}

type Mode = 'realtime' | 'polling' | 'idle'

const inputClass =
  'w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-200'

export function Thread({ chatId }: ThreadProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [mode, setMode] = useState<Mode>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const currentUserId = user?.id

  useEffect(() => {
    let active = true

    listMessages(chatId).then((result) => {
      if (!active) return
      if (result.error) {
        setLoadError(result.error)
      } else {
        setMessages(result.data ?? [])
      }
    })

    setMode('realtime')
    const cleanup = subscribeMessages(chatId, (message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      )
    })

    return () => {
      active = false
      cleanup()
    }
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  const parsed = messageSchema.safeParse({ text })
  const isValid = parsed.success

  async function handleSend() {
    if (!isValid || !currentUserId) return
    setState('sending')
    setLoadError(null)

    const result = await sendMessage(chatId, currentUserId, parsed.data.text)
    if (result.error) {
      setState('error')
      return
    }

    setText('')
    setState('idle')
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          Диалог
        </h1>
        {mode === 'polling' && (
          <span className="text-xs text-stone-500">обновление…</span>
        )}
        {mode === 'realtime' && (
          <span className="text-xs text-emerald-700">
            обновление в реальном времени
          </span>
        )}
        <ReportButton targetType="chat" targetId={chatId} />
      </div>

      {loadError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          {loadError}
        </p>
      )}

      <div className="min-h-40 space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        {messages.length === 0 && !loadError && (
          <p className="py-8 text-center text-sm text-stone-600">
            Сообщений пока нет. Напишите первым.
          </p>
        )}

        {messages.map((message) => {
          const own = message.sender_id === currentUserId
          return (
            <div
              key={message.id}
              className={`flex ${own ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  own
                    ? 'bg-teal-800 text-white'
                    : 'border border-stone-200 bg-stone-50 text-stone-950'
                }`}
              >
                {message.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={2}
          placeholder="Ваше сообщение…"
          className={inputClass}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {text.length} / {MAX_MESSAGE_LENGTH}
          </span>
          <div className="flex gap-2">
            {state === 'error' && (
              <button
                type="button"
                onClick={handleSend}
                className="rounded-xl border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Повторить
              </button>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={!isValid || state === 'sending'}
              className="rounded-xl bg-teal-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-40"
            >
              {state === 'sending' ? 'Отправка…' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
