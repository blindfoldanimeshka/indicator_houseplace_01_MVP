import { act, render, screen, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  AuthContext,
  AuthProvider,
  type AuthContextValue,
} from '@/features/auth/AuthProvider'

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
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
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

function Consumer({
  onReady,
}: {
  onReady?: (ctx: AuthContextValue) => void
}) {
  const ctx = useContext(AuthContext)
  if (ctx) onReady?.(ctx)
  return <div>{ctx?.isLoading ? 'loading' : 'ready'}</div>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.auth.getSession.mockResolvedValue({ data: { session: null } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls getSession on mount and clears isLoading', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    expect(mock.auth.getSession).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument())
  })

  it('signIn success populates session and user', async () => {
    const session = {
      user: { id: 'u1', email: 'a@b.com', email_confirmed_at: 'now' },
      access_token: 't',
    }
    mock.auth.signInWithPassword.mockResolvedValue({ error: null })
    mock.auth.getSession.mockResolvedValue({ data: { session } })

    let ctx!: AuthContextValue
    render(
      <AuthProvider>
        <Consumer onReady={(c) => (ctx = c!)} />
      </AuthProvider>,
    )

    await waitFor(() => expect(ctx?.isLoading).toBe(false))

    const result = await act(async () =>
      ctx.signIn({ email: 'a@b.com', password: 'password1' }),
    )

    expect(result.error).toBeNull()
    expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password1',
    })
  })

  it('signIn error surfaces error and no session', async () => {
    mock.auth.getSession.mockResolvedValue({ data: { session: null } })
    mock.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login.' },
    })

    let ctx!: AuthContextValue
    render(
      <AuthProvider>
        <Consumer onReady={(c) => (ctx = c!)} />
      </AuthProvider>,
    )

    await waitFor(() => expect(ctx?.isLoading).toBe(false))

    const result = await act(async () =>
      ctx.signIn({ email: 'a@b.com', password: 'wrong' }),
    )

    expect(result.error).toBe('Invalid login.')
    expect(ctx.session).toBeNull()
    expect(ctx.user).toBeNull()
  })

  it('signUp passes name and city in options.data', async () => {
    mock.auth.signUp.mockResolvedValue({ error: null })

    let ctx!: AuthContextValue
    render(
      <AuthProvider>
        <Consumer onReady={(c) => (ctx = c!)} />
      </AuthProvider>,
    )
    await waitFor(() => expect(ctx?.isLoading).toBe(false))

    const result = await act(async () =>
      ctx.signUp({ email: 'a@b.com', password: 'password1', name: 'Иван', city: 'Москва' }),
    )

    expect(result.error).toBeNull()
    expect(mock.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password1',
      options: { data: { name: 'Иван', city: 'Москва' } },
    })
  })

  it('signOut calls auth.signOut', async () => {
    mock.auth.signOut.mockResolvedValue({ error: null })

    let ctx!: AuthContextValue
    render(
      <AuthProvider>
        <Consumer onReady={(c) => (ctx = c!)} />
      </AuthProvider>,
    )
    await waitFor(() => expect(ctx?.isLoading).toBe(false))

    const result = await act(async () => ctx.signOut())

    expect(result.error).toBeNull()
    expect(mock.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('updateProfile updates users row by id', async () => {
    mock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com' } },
      error: null,
    })

    let ctx!: AuthContextValue
    render(
      <AuthProvider>
        <Consumer onReady={(c) => (ctx = c!)} />
      </AuthProvider>,
    )
    await waitFor(() => expect(ctx?.isLoading).toBe(false))

    const result = await act(async () =>
      ctx.updateProfile({ name: 'Иван', city: 'Москва' }),
    )

    expect(result.error).toBeNull()
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.from).toHaveBeenCalledWith('users')
    const instance = mock.from.mock.results[0].value
    expect(instance.update).toHaveBeenCalledWith({ name: 'Иван', city: 'Москва' })
    expect(instance.eq).toHaveBeenCalledWith('id', 'u1')
  })
})
