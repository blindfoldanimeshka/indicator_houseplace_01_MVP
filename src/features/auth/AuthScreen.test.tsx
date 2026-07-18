import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

function createMockSupabase() {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
  }
  const from = vi.fn(() => {
    const chain: Record<string, Mock> = {
      update: vi.fn(() => chain),
      eq: vi.fn(() => chain),
    }
    return chain
  })
  return { auth, from }
}

const mock = createMockSupabase()
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: mock.auth, from: mock.from }),
}))

function renderWithAuth(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    session: null,
    user: null,
    isLoading: false,
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }

  render(
    <AuthContext.Provider value={value}>
      <AuthScreen onOpenLegal={() => {}} />
    </AuthContext.Provider>,
  )

  return value
}

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.auth.getSession.mockResolvedValue({ data: { session: null } })
  })

  it('shows validation errors for empty/invalid email and short password', async () => {
    renderWithAuth()

    fireEvent.click(screen.getByRole('button', { name: /нет аккаунта|нет аккаунта/i }))

    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() =>
      expect(screen.getByText(/введите корректный email/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/пароль не короче 8 символов/i)).toBeInTheDocument()
    expect(screen.getByText(/укажите имя/i)).toBeInTheDocument()
  })

  it('toggles name and city fields between login and register', () => {
    renderWithAuth()

    expect(screen.queryByLabelText(/имя/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/город/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /нет аккаунта/i }))

    expect(screen.getByLabelText(/имя/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/город/i)).toBeInTheDocument()
  })

  it('submitting valid credentials in login mode calls signIn', async () => {
    const value = renderWithAuth()

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByLabelText(/пароль/i), {
      target: { value: 'password1' },
    })

    fireEvent.click(screen.getByRole('button', { name: /войти/i }))

    await waitFor(() => expect(value.signIn).toHaveBeenCalledTimes(1))
    expect(value.signIn).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password1',
    })
  })

  it('disables register submit until consent is checked', async () => {
    renderWithAuth()

    fireEvent.click(screen.getByRole('button', { name: /нет аккаунта/i }))

    fireEvent.change(screen.getByLabelText(/имя/i), {
      target: { value: 'Иван' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@b.com' },
    })
    fireEvent.change(screen.getByLabelText(/пароль/i), {
      target: { value: 'password1' },
    })

    const submit = screen.getByRole('button', { name: /зарегистрироваться/i })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/я согласен/i))
    expect(submit).toBeEnabled()
  })

  it('reset flow shows confirmation after sending', async () => {
    const value = renderWithAuth()

    fireEvent.click(screen.getByRole('button', { name: /забыли пароль/i }))

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'a@b.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /отправить ссылку/i }))

    await waitFor(() => expect(value.resetPassword).toHaveBeenCalledTimes(1))
    expect(value.resetPassword).toHaveBeenCalledWith('a@b.com')
    expect(
      screen.getByText(/письмо отправлено, проверьте почту/i),
    ).toBeInTheDocument()
  })
})
