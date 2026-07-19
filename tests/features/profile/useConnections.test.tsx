import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useConnections } from '@/features/profile/useConnections'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

const authMock = {
  getUser: vi.fn(),
  linkIdentity: vi.fn(),
  unlinkIdentity: vi.fn(),
  getSession: vi.fn(),
}
const fromMock = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: authMock,
    from: () => fromMock,
  }),
}))

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

describe('useConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.getUser.mockResolvedValue({
      data: { user: { identities: [{ provider: 'google', id: 'id1' }] } },
      error: null,
    })
    fromMock.maybeSingle.mockResolvedValue({ data: { telegram_id: null }, error: null })
  })

  it('reads connected providers from identities and telegram_id', async () => {
    authMock.getUser.mockResolvedValue({
      data: {
        user: { identities: [{ provider: 'google', id: 'id1' }, { provider: 'vk', id: 'id2' }] },
      },
      error: null,
    })
    fromMock.maybeSingle.mockResolvedValue({ data: { telegram_id: '123' }, error: null })

    const { result } = renderHook(() => useConnections(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    const byId = Object.fromEntries(
      result.current.connections.map((c) => [c.id, c.connected]),
    )
    expect(byId.google).toBe(true)
    expect(byId.vk).toBe(true)
    expect(byId.telegram).toBe(true)
    expect(byId.apple).toBe(false)
    expect(byId.yandex).toBe(false)
  })

  it('links a native provider via linkIdentity', async () => {
    authMock.linkIdentity.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConnections(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      void result.current.link('yandex')
    })
    await waitFor(() => expect(authMock.linkIdentity).toHaveBeenCalledWith({
      provider: 'yandex',
      options: { redirectTo: expect.any(String) },
    }))
  })

  it('errors when linkIdentity fails', async () => {
    authMock.linkIdentity.mockResolvedValue({ error: { message: 'nope' } })
    const { result } = renderHook(() => useConnections(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.link('yandex')
    })
    expect(result.current.error).toBe('nope')
  })

  it('unlinks telegram by clearing telegram_id', async () => {
    fromMock.maybeSingle.mockResolvedValue({ data: { telegram_id: '123' }, error: null })
    const { result } = renderHook(() => useConnections(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.unlink('telegram')
    })
    expect(fromMock.update).toHaveBeenCalledWith({ telegram_id: null })
  })
})
