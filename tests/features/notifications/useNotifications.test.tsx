import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotifications } from '@/features/notifications/useNotifications'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'
import {
  fetchUnread,
  markAllRead,
  dispatchNotifications,
} from '@/features/notifications/notificationApi'

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        }),
      }),
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  }),
}))

vi.mock('@/features/notifications/notificationApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/notifications/notificationApi')>()
  return {
    ...actual,
    fetchUnread: vi.fn(),
    markAllRead: vi.fn(),
    dispatchNotifications: vi.fn(),
  }
})

function wrapper(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    session: { user: { id: 'u1' } } as never,
    user: { id: 'u1', email: 'a@b.com', user_metadata: {} } as never,
    isLoading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    resetPassword: vi.fn(),
    deleteAccount: vi.fn(),
    ...overrides,
  }
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.mocked(fetchUnread).mockReset()
    vi.mocked(markAllRead).mockReset()
    vi.mocked(dispatchNotifications).mockReset()
  })

  it('reports zero unread when there are no notifications', async () => {
    vi.mocked(fetchUnread).mockResolvedValue([])

    const { result } = renderHook(() => useNotifications(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.unreadCount).toBe(0)
    expect(result.current.items).toEqual([])
  })

  it('counts unread notifications from fetch', async () => {
    vi.mocked(fetchUnread).mockResolvedValue([
      {
        id: 'n1',
        type: 'new_message',
        payload: { preview: 'Привет' },
        read: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ])

    const { result } = renderHook(() => useNotifications(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.unreadCount).toBe(1))
    expect(result.current.items[0].type).toBe('new_message')
  })

  it('marks all as read via the api', async () => {
    vi.mocked(fetchUnread).mockResolvedValue([
      {
        id: 'n1',
        type: 'new_chat',
        payload: null,
        read: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ])
    vi.mocked(markAllRead).mockResolvedValue(undefined)

    const { result } = renderHook(() => useNotifications(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.unreadCount).toBe(1))

    await act(async () => {
      await result.current.markAll()
    })

    expect(markAllRead).toHaveBeenCalledTimes(1)
    expect(result.current.unreadCount).toBe(0)
  })
})
