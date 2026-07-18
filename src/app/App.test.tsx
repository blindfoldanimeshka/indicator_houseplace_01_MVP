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
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

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
        from: vi.fn(() => chain),
      }),
    }))

    const { App: AppModule } = await import('@/app/App')
    render(<AppModule />)

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Объявления' }),
      ).toBeInTheDocument(),
    )
  })
})
