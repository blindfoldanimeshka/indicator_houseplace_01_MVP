import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockSession = {
  user: { id: 'u1', email: 'test@example.com', email_confirmed_at: 'now' },
  access_token: 'token',
}

describe('App', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('shows the product name when a session is present', async () => {
    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: () => ({
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
          onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } },
          })),
          signOut: vi.fn(),
          getUser: vi.fn(),
        },
        from: vi.fn(),
      }),
    }))

    const { App: AppModule } = await import('@/app/App')
    render(<AppModule />)

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Аренда жилья напрямую.' }),
      ).toBeInTheDocument(),
    )
  })
})
