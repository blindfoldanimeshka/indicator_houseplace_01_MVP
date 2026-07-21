import { getSupabaseClient } from '@/lib/supabase'

export interface AppNotification {
  id: string
  type: string
  payload: Record<string, unknown> | null
  read: boolean
  created_at: string
}

// Fetch the current user's unread notifications (in-app inbox).
export async function fetchUnread(): Promise<AppNotification[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, payload, read, created_at')
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as AppNotification[]
}

// Mark a single notification as read.
export async function markRead(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}

// Mark all notifications of the current user as read.
export async function markAllRead(): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)
  if (error) throw error
}

// Trigger delivery of pending notifications over the user's enabled channels
// (Telegram / email). In-app rows are already persisted by DB triggers.
export async function dispatchNotifications(): Promise<{ delivered: number }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('notify', {
    method: 'POST',
  })
  if (error) throw error
  return (data ?? { delivered: 0 }) as { delivered: number }
}
