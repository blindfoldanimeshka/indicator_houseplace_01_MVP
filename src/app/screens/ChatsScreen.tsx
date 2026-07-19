import { ChatList } from '@/features/chat/ChatList'
import { NotificationPanel } from '@/features/chat/NotificationPanel'
import { useUnreadCounts } from '@/features/chat/useUnreadCounts'

interface ChatsScreenProps {
  onBack: () => void
  unread: ReturnType<typeof useUnreadCounts>
  onOpenChat: (chatId: string) => void
  showNotifications: boolean
  onCloseNotifications: () => void
}

export function ChatsScreen({
  onBack,
  unread,
  onOpenChat,
  showNotifications,
  onCloseNotifications,
}: ChatsScreenProps) {
  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Назад
      </button>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Мои чаты
      </h1>
      <ChatList
        onOpen={onOpenChat}
        unread={unread}
        onChatsResolved={unread.setMyChats}
      />
      {showNotifications && (
        <NotificationPanel
          notifications={unread.recent}
          onOpenChat={onOpenChat}
          onClose={onCloseNotifications}
        />
      )}
    </section>
  )
}