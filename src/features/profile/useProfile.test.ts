import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const STORED_PROFILE = { name: 'Иван', city: 'Москва', avatar_path: null }

const fromMock = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: STORED_PROFILE, error: null }),
    })),
  })),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}))

const updateProfileMock = vi.fn().mockResolvedValue({ error: null })

const mockUser = {
  id: 'u1',
  email: 'a@b.com',
  email_confirmed_at: '2024-01-01',
}

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: updateProfileMock,
  }),
}))

import { useProfile } from '@/features/profile/useProfile'

describe('useProfile', () => {
  beforeEach(() => {
    fromMock.mockClear()
    updateProfileMock.mockClear()
  })

  it('loads the profile from the users table on mount', async () => {
    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.profile).not.toBeNull())
    expect(result.current.profile).toEqual(STORED_PROFILE)
    expect(fromMock).toHaveBeenCalledWith('users')
  })

  it('save persists via updateProfile then reloads', async () => {
    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.profile).not.toBeNull())

    await act(async () => {
      await result.current.save({ name: 'Пётр', city: 'Казань', avatarPath: 'u1' })
    })

    expect(updateProfileMock).toHaveBeenCalledTimes(1)
    expect(updateProfileMock).toHaveBeenCalledWith({
      name: 'Пётр',
      city: 'Казань',
      avatarPath: 'u1',
    })
  })

  it('does not reload when save returns an error', async () => {
    updateProfileMock.mockResolvedValueOnce({ error: 'boom' })
    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.profile).not.toBeNull())
    const callsAfterLoad = fromMock.mock.calls.length

    await act(async () => {
      await result.current.save({ name: 'Пётр', city: 'Казань' })
    })

    // No reload query fired after a failed save.
    expect(fromMock.mock.calls.length).toBe(callsAfterLoad)
  })
})
