import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PersonalInfoTab } from '@/features/profile/components/PersonalInfoTab'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

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
  beforeEach(() => {
    fromMock.mockClear()
  })

  it('renders name and city inputs and a save button', async () => {
    renderWithAuth()

    // Values load from the `users` table, so wait for them.
    expect(await screen.findByDisplayValue('Иван')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Москва')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /сохранить/i }),
    ).toBeInTheDocument()
  })

  it('calls updateProfile with valid data on submit', async () => {
    const value = renderWithAuth()

    await screen.findByDisplayValue('Иван')
    fireEvent.click(
      screen.getByRole('button', { name: /сохранить/i }),
    )

    await waitFor(() =>
      expect(value.updateProfile).toHaveBeenCalledTimes(1),
    )
    expect(value.updateProfile).toHaveBeenCalledWith({
      name: 'Иван',
      city: 'Москва',
      avatarPath: null,
    })
  })

  it('shows a validation error and does not call updateProfile when name is empty', async () => {
    const value = renderWithAuth()

    const nameInput = await screen.findByDisplayValue('Иван')
    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    expect(await screen.findByText(/укажите имя/i)).toBeInTheDocument()
    expect(value.updateProfile).not.toHaveBeenCalled()
  })

  it('shows a success message after saving', async () => {
    renderWithAuth()

    await screen.findByDisplayValue('Иван')
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }))

    await waitFor(() =>
      expect(screen.getByText(/профиль сохранён/i)).toBeInTheDocument(),
    )
  })
})

