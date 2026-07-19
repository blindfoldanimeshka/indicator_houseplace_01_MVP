import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { UnreadNotification } from '@/features/chat/useUnreadCounts'

export function NotificationPanel({
  notifications,
  onOpenChat,
  onClose,
}: {
  notifications: UnreadNotification[]
  onOpenChat: (chatId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [onClose])

  function formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Уведомления"
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="absolute bottom-[96px] left-1/2 z-50 w-80 -translate-x-1/2 overflow-hidden rounded-2xl border border-border-muted bg-muted shadow-xl"
    >
      <div className="border-b border-border-muted px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Уведомления</h2>
      </div>
      {notifications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Новых уведомлений нет.
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {notifications.map((note, i) => (
            <motion.li
              key={note.messageId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                type="button"
                onClick={() => onOpenChat(note.chatId)}
                className="flex w-full flex-col gap-0.5 border-b border-stone-100 px-4 py-3 text-left transition hover:bg-stone-50"
              >
                <span className="line-clamp-2 text-sm text-foreground">
                  {note.text}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(note.createdAt)}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}
