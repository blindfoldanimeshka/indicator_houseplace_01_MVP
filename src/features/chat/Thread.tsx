import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { listMessages, sendMessage, subscribeMessages } from './chatApi'
import { messageSchema, MAX_MESSAGE_LENGTH } from './chatSchema'
import { ReportButton } from '@/features/reports/ReportButton'
import { getSupabaseClient } from '@/lib/supabase'
import { listTemplates } from './templatesApi'
import { createReview } from '@/features/reviews/reviewApi'
import type { MessageRow } from './chatApi'

interface ThreadProps {
  chatId: string
}

type Mode = 'realtime' | 'polling' | 'idle'

const inputClass =
  'w-full resize-none rounded-xl border border-border-muted bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-secondary/40'

export function Thread({ chatId }: ThreadProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [mode, setMode] = useState<Mode>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<{ id: string; title: string; body: string }[]>([])
  const [attachmentUrl, setAttachmentUrl] = useState<string>('')
  const [chatStatus, setChatStatus] = useState<string>('open')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewDone, setReviewDone] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const isMountedRef = useRef(false)
  const prevCountRef = useRef(0)

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

    listTemplates().then((res) => {
      if (active && res.data) setTemplates(res.data)
    })

    getSupabaseClient()
      .from('chats')
      .select('status')
      .eq('id', chatId)
      .maybeSingle()
      .then((res) => {
        if (active && res.data) setChatStatus((res.data as { status: string }).status)
      })

    const cleanup = subscribeMessages(
      chatId,
      (message) => {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message],
        )
      },
      setMode,
    )

    return () => {
      active = false
      cleanup()
    }
  }, [chatId])

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      prevCountRef.current = messages.length
      return // skip auto-scroll on mount so restored scroll position is preserved
    }
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
    }
    prevCountRef.current = messages.length
  }, [messages])

  const parsed = messageSchema.safeParse({ text })
  const isValid = parsed.success

  async function handleSend() {
    if (!isValid || !currentUserId) return
    setState('sending')
    setLoadError(null)

    const result = await sendMessage(
      chatId,
      currentUserId,
      parsed.data.text,
      attachmentUrl || null,
    )
    if (result.error) {
      setState('error')
      return
    }

    setText('')
    setAttachmentUrl('')
    setState('idle')
  }

  function applyTemplate(body: string) {
    setText((prev) => (prev ? `${prev}\n${body}` : body))
  }

  async function handleReview() {
    if (!currentUserId) return
    const counterparty = messages.find((m) => m.sender_id !== currentUserId)
    if (!counterparty) return
    setReviewError(null)
    const res = await createReview(
      chatId,
      counterparty.sender_id,
      reviewRating,
      reviewComment || undefined,
    )
    if (res.error) {
      setReviewError(res.error)
      return
    }
    setReviewDone(true)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Диалог
        </h1>
        {mode === 'polling' && (
          <span className="text-xs text-muted-foreground">обновление…</span>
        )}
        {mode === 'realtime' && (
          <span className="text-xs text-emerald-700">
            обновление в реальном времени
          </span>
        )}
        <ReportButton targetType="chat" targetId={chatId} />
      </div>

      {chatStatus === 'closed' && !reviewDone && (
        <div className="surface-elevated space-y-3 rounded-2xl p-4 shadow-[var(--shadow-surface)]">
          <h2 className="text-sm font-semibold text-foreground">
            Оставьте отзыв о собеседнике
          </h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setReviewRating(n)}
                className={n <= reviewRating ? 'text-amber-500' : 'text-muted-foreground'}
                aria-label={`Оценка ${n}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            rows={2}
            className={inputClass}
          />
          {reviewError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-950">
              {reviewError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleReview()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Отправить отзыв
          </button>
        </div>
      )}

      {loadError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950">
          {loadError}
        </p>
      )}

      <div className="min-h-40 space-y-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-surface)]">
        {messages.length === 0 && !loadError && (
          <p className="py-8 text-center text-sm text-muted-foreground">
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
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  own
                    ? 'bg-primary text-white rounded-br-md shadow-[var(--shadow-glow)]'
                    : 'bg-muted/40 text-foreground rounded-bl-md'
                }`}
              >
                {message.text}
                {message.attachment_path && (
                  <div className="mt-2">
                    {message.attachment_type === 'image' ? (
                      <img
                        src={message.attachment_path}
                        alt="Вложение"
                        className="max-h-48 rounded-lg"
                      />
                    ) : (
                      <a
                        href={message.attachment_path}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Документ
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2">
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t.body)}
                className="rounded-full border border-border-muted px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={2}
          placeholder="Ваше сообщение…"
          className={inputClass}
        />

        <input
          value={attachmentUrl}
          onChange={(event) => setAttachmentUrl(event.target.value)}
          placeholder="Ссылка на вложение (необязательно)"
          className="w-full rounded-xl border border-border-muted bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-secondary/40"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {text.length} / {MAX_MESSAGE_LENGTH}
          </span>
          <div className="flex gap-2">
            {state === 'error' && (
              <button
                type="button"
                onClick={handleSend}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-500/10"
              >
                Повторить
              </button>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={!isValid || state === 'sending'}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-all duration-200 hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
            >
              {state === 'sending' ? 'Отправка…' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
