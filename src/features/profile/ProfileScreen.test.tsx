import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    session: { user: { id: 'u1' } } as never,
    user: {
      id: 'u1',
      email: 'a@b.com',
      email_confirmed_at: '2024-01-01',
      user_metadata: { name: 'Иван', city: 'Москва' },
    } as never,
    isLoading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn(),
    deleteAccount: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }

  render(
    <AuthContext.Provider value={value}>
      <ProfileScreen onBack={() => {}} />
    </AuthContext.Provider>,
  )

  return value
}

describe('ProfileScreen delete account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('calls deleteAccount then signOut on confirm', async () => {
    const value = renderWithAuth()

    fireEvent.click(
      screen.getByRole('button', { name: /удалить аккаунт и мои данные/i }),
    )

    await waitFor(() => expect(value.deleteAccount).toHaveBeenCalledTimes(1))
    expect(value.signOut).toHaveBeenCalledTimes(1)
  })

  it('does not delete when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const value = renderWithAuth()

    fireEvent.click(
      screen.getByRole('button', { name: /удалить аккаунт и мои данные/i }),
    )

    await waitFor(() => expect(value.deleteAccount).not.toHaveBeenCalled())
  })

  it('shows error when deleteAccount fails', async () => {
    const value = renderWithAuth({
      deleteAccount: vi.fn().mockResolvedValue({ error: 'Нельзя удалить' }),
    })

    fireEvent.click(
      screen.getByRole('button', { name: /удалить аккаунт и мои данные/i }),
    )

    await waitFor(() =>
      expect(screen.getByText(/нельзя удалить/i)).toBeInTheDocument(),
    )
    expect(value.signOut).not.toHaveBeenCalled()
  })
})
