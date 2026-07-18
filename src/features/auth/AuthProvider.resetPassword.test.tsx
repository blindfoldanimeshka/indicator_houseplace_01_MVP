import { act, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, AuthProvider, type AuthContextValue } from '@/features/auth/AuthProvider'

type ResetResult = { error: { message: string; status?: number } | null }

const mock = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    resetPasswordForEmail: vi.fn(
      () => Promise.resolve<ResetResult>({ error: null }),
    ),
  },
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: mock.auth, from: vi.fn() }),
}))


function Consumer({ onResult }: { onResult?: (r: { error: string | null }) => void }) {
  const ctx = useContext(AuthContext)
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const r = await ctx!.resetPassword('a@b.com')
          onResult?.(r)
        }}
      >
        go
      </button>
    </div>
  )
}

describe('AuthProvider.resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('success calls resetPasswordForEmail with redirectTo and resolves no error', async () => {
    let ctx!: AuthContextValue
    let result: { error: string | null } | undefined
    function Capture() {
      ctx = useContext(AuthContext)!
      return <Consumer onResult={(r) => (result = r)} />
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )
    await waitFor(() => expect(ctx).toBeDefined())

    await act(async () => {
      result = await ctx.resetPassword('a@b.com')
    })

    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: expect.stringContaining(window.location.origin),
    })
    expect(result).toEqual({ error: null })
  })

  it('maps generic error to its message', async () => {
    mock.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'boom' } })

    let ctx!: AuthContextValue
    function Capture() {
      ctx = useContext(AuthContext)!
      return <Consumer />
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )
    await waitFor(() => expect(ctx).toBeDefined())

    const result = await act(async () => ctx.resetPassword('a@b.com'))

    expect(result).toEqual({ error: 'boom' })
  })

  it('maps 429 to friendly rate-limit message', async () => {
    mock.auth.resetPasswordForEmail.mockResolvedValue({
      error: { status: 429, message: 'rate' },
    })

    let ctx!: AuthContextValue
    function Capture() {
      ctx = useContext(AuthContext)!
      return <Consumer />
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    )
    await waitFor(() => expect(ctx).toBeDefined())

    const result = await act(async () => ctx.resetPassword('a@b.com'))

    expect(result).toEqual({ error: 'Слишком много попыток, попробуйте позже' })
  })
})
