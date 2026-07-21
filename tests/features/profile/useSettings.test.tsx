import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSettings } from '@/features/profile/useSettings'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

const selectMock = vi.fn()
const upsertMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: selectMock,
        }),
      }),
      upsert: upsertMock,
    }),
  }),
}))

function wrapper(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    session: { user: { id: 'u1' } } as never,
    user: {
      id: 'u1',
      email: 'a@b.com',
      user_metadata: {},
    } as never,
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

describe('useSettings', () => {
  beforeEach(() => {
    selectMock.mockReset()
    upsertMock.mockReset()
  })

  it('loads persisted settings when present', async () => {
    selectMock.mockResolvedValue({
      data: {
        email_notif: false,
        push_notif: true,
        inapp_notif: false,
        show_profile: true,
        show_email: true,
        theme: 'dark',
        language: 'en',
      },
      error: null,
    })

    const { result } = renderHook(() => useSettings(), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings.preferences.theme).toBe('dark')
    expect(result.current.settings.notifications.email).toBe(false)
    expect(result.current.settings.privacy.showEmail).toBe(true)
  })

  it('falls back to defaults when no row exists', async () => {
    selectMock.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useSettings(), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings.preferences.language).toBe('ru')
    expect(result.current.settings.notifications.push).toBe(true)
  })

  it('upserts changed settings on save', async () => {
    selectMock.mockResolvedValue({ data: null, error: null })
    upsertMock.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useSettings(), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.save({
        ...result.current.settings,
        notifications: { ...result.current.settings.notifications, email: false },
      })
    })

    await waitFor(() => expect(result.current.saving).toBe(false))
    // save() mirrors settings into user_settings AND notification_prefs.
    expect(upsertMock).toHaveBeenCalledTimes(2)
    const userSettingsCall = upsertMock.mock.calls[0][0]
    const prefsCall = upsertMock.mock.calls[1][0]
    expect(userSettingsCall.email_notif).toBe(false)
    expect(userSettingsCall.user_id).toBe('u1')
    expect(prefsCall.email_notif).toBe(false)
    expect(prefsCall.user_id).toBe('u1')
  })

  it('surfaces upsert errors', async () => {
    selectMock.mockResolvedValue({ data: null, error: null })
    upsertMock.mockResolvedValue({ error: { message: 'boom' } })

    const { result } = renderHook(() => useSettings(), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.save({
        ...result.current.settings,
        privacy: { ...result.current.settings.privacy, showProfile: false },
      })
    })

    await waitFor(() => expect(result.current.error).toBe('boom'))
  })
})
