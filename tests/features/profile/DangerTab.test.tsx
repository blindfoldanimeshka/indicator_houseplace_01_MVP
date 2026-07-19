import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DangerTab } from '@/features/profile/components/DangerTab'
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
    updateProfile: vi.fn(),
    resetPassword: vi.fn(),
    deleteAccount: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }

  render(
    <AuthContext.Provider value={value}>
      <DangerTab />
    </AuthContext.Provider>,
  )

  return value
}

describe('DangerTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Sign Out and Delete Account buttons', () => {
    renderWithAuth()
    expect(
      screen.getByRole('button', { name: /выйти/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /удалить аккаунт/i }),
    ).toBeInTheDocument()
  })

  it('opens confirm dialog when Delete Account clicked and deletes on confirm', async () => {
    const value = renderWithAuth()

    fireEvent.click(
      screen.getByRole('button', { name: /удалить аккаунт/i }),
    )

    const dialog = screen.getByRole('dialog', { name: /удалить аккаунт/i })
    expect(dialog).toHaveTextContent(/безвозвратно/i)

    fireEvent.click(screen.getByRole('button', { name: /^удалить$/i }))

    await waitFor(() => expect(value.deleteAccount).toHaveBeenCalledTimes(1))
    expect(value.signOut).toHaveBeenCalledTimes(1)
  })

  it('does not delete when dialog is cancelled', async () => {
    const value = renderWithAuth()

    fireEvent.click(
      screen.getByRole('button', { name: /удалить аккаунт/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /отмена/i }))

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /удалить аккаунт/i }),
      ).not.toBeInTheDocument(),
    )
    expect(value.deleteAccount).not.toHaveBeenCalled()
  })

  it('shows error when deleteAccount fails', async () => {
    const value = renderWithAuth({
      deleteAccount: vi.fn().mockResolvedValue({ error: 'Нельзя удалить' }),
    })

    fireEvent.click(
      screen.getByRole('button', { name: /удалить аккаунт/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /^удалить$/i }))

    await waitFor(() =>
      expect(screen.getByText(/нельзя удалить/i)).toBeInTheDocument(),
    )
    expect(value.signOut).not.toHaveBeenCalled()
  })

  it('signs out on confirm', async () => {
    const value = renderWithAuth()

    fireEvent.click(screen.getAllByRole('button', { name: /выйти/i })[0])

    const dialog = screen.getByRole('dialog', { name: /выйти из аккаунта/i })
    expect(dialog).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: /^выйти$/i }))

    await waitFor(() => expect(value.signOut).toHaveBeenCalledTimes(1))
  })
})
