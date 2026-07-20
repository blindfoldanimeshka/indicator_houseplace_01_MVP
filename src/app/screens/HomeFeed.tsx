import { Feed } from '@/features/listings/Feed'
import { EnvironmentNotice } from '@/components/system/EnvironmentNotice'
import { NotificationPanel } from '@/features/chat/NotificationPanel'
import { useUnreadCounts } from '@/features/chat/useUnreadCounts'
import type { Database } from '@/types/database'

type ListingRow = Database['public']['Tables']['listings']['Row']

interface HomeFeedProps {
  onOpen: (listing: ListingRow) => void
  onCreate?: () => void
  userEmailConfirmed: boolean
  isSupabaseConfigured: boolean
  showNotifications: boolean
  unread: ReturnType<typeof useUnreadCounts>
  onOpenChat: (chatId: string) => void
  onCloseNotifications: () => void
}

export function HomeFeed({
  onOpen,
  onCreate,
  userEmailConfirmed,
  isSupabaseConfigured,
  showNotifications,
  unread,
  onOpenChat,
  onCloseNotifications,
}: HomeFeedProps) {
  return (
    <>
      <Feed onOpen={onOpen} onCreate={onCreate} />
      {!userEmailConfirmed && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Подтвердите email, чтобы публиковать объявления.
        </p>
      )}
      <EnvironmentNotice configured={isSupabaseConfigured} />
      {showNotifications && (
        <NotificationPanel
          notifications={unread.recent}
          onOpenChat={onOpenChat}
          onClose={onCloseNotifications}
        />
      )}
    </>
  )
}