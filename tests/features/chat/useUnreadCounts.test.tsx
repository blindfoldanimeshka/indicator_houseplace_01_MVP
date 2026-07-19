import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUnreadCounts } from '@/features/chat/useUnreadCounts'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

const channelHandlers: Record<string, (payload: unknown) => void> = {}
let subscribeCallback: ((status: string) => void) | null = null

const channelMock = {
  on: (_event: string, _filter: unknown, handler: (payload: unknown) => void) => {
    channelHandlers['message'] = handler as never
    return channelMock
  },
  subscribe: (cb: (status: string) => void) => {
    subscribeCallback = cb
    return channelMock
  },
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    channel: () => channelMock,
    removeChannel: vi.fn(),
  }),
}))

function wrapper(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    session: { user: { id: 'me' } } as never,
    user: { id: 'me', email: 'a@b.com', user_metadata: {} } as never,
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

describe('useUnreadCounts', () => {
  beforeEach(() => {
    for (const k of Object.keys(channelHandlers)) delete channelHandlers[k]
    subscribeCallback = null
  })

  it('ignores messages sent by the current user', () => {
    const { result } = renderHook(() => useUnreadCounts(), {
      wrapper: wrapper(),
    })

    act(() => {
      channelHandlers['message']?.({
        new: { id: 'm1', chat_id: 'c1', sender_id: 'me', text: 'hi', created_at: new Date().toISOString() },
      })
    })

    expect(result.current.total).toBe(0)
  })

  it('counts incoming messages from other users in my chats', () => {
    const { result } = renderHook(() => useUnreadCounts(), {
      wrapper: wrapper(),
    })

    act(() => {
      result.current.setMyChats(['c1'])
    })

    act(() => {
      channelHandlers['message']?.({
        new: { id: 'm1', chat_id: 'c1', sender_id: 'other', text: 'hello', created_at: new Date().toISOString() },
      })
    })

    expect(result.current.total).toBe(1)
    expect(result.current.byChat['c1']).toBe(1)
    expect(result.current.recent[0].text).toBe('hello')
  })

  it('clears a chat when marked read', () => {
    const { result } = renderHook(() => useUnreadCounts(), {
      wrapper: wrapper(),
    })

    act(() => {
      result.current.setMyChats(['c1'])
      channelHandlers['message']?.({
        new: { id: 'm1', chat_id: 'c1', sender_id: 'other', text: 'hello', created_at: new Date().toISOString() },
      })
    })

    act(() => {
      result.current.markChatRead('c1')
    })

    expect(result.current.total).toBe(0)
    expect(result.current.byChat['c1']).toBeUndefined()
  })
})
