import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfilePage } from '@/features/profile/components/ProfilePage'
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
      <ProfilePage />
    </AuthContext.Provider>,
  )

  return value
}

describe('ProfilePage tab navigation', () => {
  it('shows default personal tab content', () => {
    renderWithAuth()

    expect(screen.getByRole('heading', { name: /профиль/i })).toBeInTheDocument()
    expect(screen.getByText(/имя/i)).toBeInTheDocument()
  })

  it('switches to Аккаунт tab', () => {
    renderWithAuth()

    fireEvent.click(screen.getByRole('tab', { name: /Аккаунт/i }))

    expect(
      screen.getByText(/уведомления в приложении/i),
    ).toBeInTheDocument()
  })

  it('switches to Подключения tab', () => {
    renderWithAuth()

    fireEvent.click(screen.getByRole('tab', { name: /Подключения/i }))

    expect(screen.getByText(/подключённые сервисы/i)).toBeInTheDocument()
  })

  it('switches to Действия tab', () => {
    renderWithAuth()

    fireEvent.click(screen.getByRole('tab', { name: /Действия/i }))

    expect(
      screen.getByRole('button', { name: /удалить аккаунт/i }),
    ).toBeInTheDocument()
  })
})
