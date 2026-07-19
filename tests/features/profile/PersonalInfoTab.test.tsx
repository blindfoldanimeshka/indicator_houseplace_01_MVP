import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PersonalInfoTab } from '@/features/profile/components/PersonalInfoTab'
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
      <PersonalInfoTab />
    </AuthContext.Provider>,
  )

  return value
}

describe('PersonalInfoTab', () => {
  it('renders name and city inputs and a save button', () => {
    renderWithAuth()

    expect(screen.getByLabelText(/имя/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/город/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /сохранить/i }),
    ).toBeInTheDocument()
  })

  it('calls updateProfile with valid data on submit', async () => {
    const value = renderWithAuth()

    fireEvent.click(
      screen.getByRole('button', { name: /сохранить/i }),
    )

    await waitFor(() =>
      expect(value.updateProfile).toHaveBeenCalledTimes(1),
    )
    expect(value.updateProfile).toHaveBeenCalledWith({
      name: 'Иван',
      city: 'Москва',
    })
  })

  it('shows a success message after saving', async () => {
    renderWithAuth()

    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() =>
      expect(screen.getByText(/профиль сохранён/i)).toBeInTheDocument(),
    )
  })
})
