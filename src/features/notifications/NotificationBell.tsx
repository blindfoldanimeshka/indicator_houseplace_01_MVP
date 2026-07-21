import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNotifications } from '@/features/notifications/useNotifications'
import { useAuth } from '@/features/auth/useAuth'

function notificationLabel(type: string): string {
  switch (type) {
    case 'new_message':
      return 'Новое сообщение'
    case 'new_chat':
      return 'Новый чат по объявлению'
    case 'deal_closed':
      return 'Сделка закрыта'
    default:
      return 'Уведомление'
  }
}

function preview(n: { type: string; payload: Record<string, unknown> | null }): string {
  if (n.type === 'new_message' && n.payload?.preview) {
    return String(n.payload.preview)
  }
  return ''
}

export function NotificationBell() {
  const { user } = useAuth()
  const { items, unreadCount, markOneRead, markAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Уведомления${unreadCount ? `, ${unreadCount} непрочитанных` : ''}`}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted/60"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-surface)] ring-1 ring-border-muted"
          >
            <div className="flex items-center justify-between border-b border-border-muted px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Уведомления</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Прочитать все
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Пока пусто
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void markOneRead(n.id)}
                    className={`flex w-full flex-col gap-0.5 border-b border-border-muted px-4 py-3 text-left transition last:border-0 hover:bg-muted/40 ${
                      n.read ? '' : 'bg-primary/5'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {!n.read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                      {notificationLabel(n.type)}
                    </span>
                    {preview(n) && (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {preview(n)}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
