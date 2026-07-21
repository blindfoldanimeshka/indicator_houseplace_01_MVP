import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/features/auth/useAuth'
import {
  fetchUnread,
  markAllRead,
  markRead,
  type AppNotification,
} from './notificationApi'

interface UseNotificationsResult {
  items: AppNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markOneRead: (id: string) => Promise<void>
  markAll: () => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUnread()
      setItems(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки уведомлений')
    } finally {
      setLoading(false)
    }
  }, [user])

  const markOneRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await markRead(id)
    } catch {
      void refresh()
    }
  }, [refresh])

  const markAll = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await markAllRead()
    } catch {
      void refresh()
    }
  }, [refresh])

  // Initial load + realtime subscription for new rows.
  useEffect(() => {
    if (!user) {
      setItems([])
      return
    }
    void refresh()

    let channel: ReturnType<ReturnType<typeof getSupabaseClient>['channel']> | null = null
    try {
      const supabase = getSupabaseClient()
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refresh()
          },
        )
        .subscribe()
    } catch {
      // Realtime optional; polling via refresh is enough.
    }

    return () => {
      if (channel) {
        try {
          getSupabaseClient().removeChannel(channel)
        } catch {
          /* noop */
        }
      }
    }
  }, [user, refresh])

  return {
    items,
    unreadCount: items.filter((n) => !n.read).length,
    loading,
    error,
    markOneRead,
    markAll,
    refresh,
  }
}
