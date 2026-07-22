import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { UnreadNotification } from '@/features/chat/useUnreadCounts'

const panelVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.96 },
}

const panelTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 35,
}

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, type: 'spring' as const, stiffness: 500, damping: 30 },
  }),
}

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
    <AnimatePresence mode="wait">
      <motion.div
        ref={ref}
        role="dialog"
        aria-label="Уведомления"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={panelTransition}
        className="absolute bottom-[96px] left-1/2 z-50 w-80 -translate-x-1/2 overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-float)] backdrop-blur-xl"
      >
        <div className="px-4 py-3">
          <h2 className="font-display text-sm text-foreground">Уведомления</h2>
        </div>
        {notifications.length === 0 ? (
          <motion.p
            variants={itemVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            Новых уведомлений нет.
          </motion.p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((note, i) => (
              <motion.li
                key={note.messageId}
                variants={itemVariants}
                custom={i}
                initial="hidden"
                animate="visible"
              >
                <button
                  type="button"
                  onClick={() => onOpenChat(note.chatId)}
                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-muted/60"
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
    </AnimatePresence>
  )
}
