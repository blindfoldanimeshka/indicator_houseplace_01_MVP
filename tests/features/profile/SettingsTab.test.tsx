import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsTab } from '@/features/profile/components/SettingsTab'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  }),
}))

function renderWithAuth(ui: React.ReactElement) {
  const value: AuthContextValue = {
    session: { user: { id: 'u1' } } as never,
    user: { id: 'u1', email: 'a@b.com', user_metadata: {} } as never,
    isLoading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    resetPassword: vi.fn(),
    deleteAccount: vi.fn(),
  }
  return render(
    <AuthContext.Provider value={value}>{ui}</AuthContext.Provider>,
  )
}

describe('SettingsTab', () => {
  it('renders the four sub-tab labels', () => {
    renderWithAuth(<SettingsTab />)

    expect(screen.getByRole('tab', { name: /уведомления/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /приватность/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /безопасность/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /предпочтения/i })).toBeInTheDocument()
  })

  it('shows notifications content by default', () => {
    renderWithAuth(<SettingsTab />)

    expect(screen.getByText(/email-уведомления/i)).toBeInTheDocument()
    expect(screen.getByText(/push-уведомления/i)).toBeInTheDocument()
    expect(screen.getByText(/уведомления в приложении/i)).toBeInTheDocument()
  })

  it('shows privacy content when its sub-tab is clicked', () => {
    renderWithAuth(<SettingsTab />)

    fireEvent.click(screen.getByRole('tab', { name: /приватность/i }))

    expect(screen.getByText(/показывать профиль/i)).toBeInTheDocument()
    expect(screen.getByText(/показывать email/i)).toBeInTheDocument()
  })

  it('shows security content when its sub-tab is clicked', () => {
    renderWithAuth(<SettingsTab />)

    fireEvent.click(screen.getByRole('tab', { name: /безопасность/i }))

    expect(screen.getByRole('button', { name: /сменить пароль/i })).toBeInTheDocument()
  })

  it('flips aria-pressed when a notification toggle is clicked', () => {
    renderWithAuth(<SettingsTab />)

    fireEvent.click(screen.getByRole('tab', { name: /уведомления/i }))

    const toggle = screen.getByRole('switch', { name: /email-уведомления/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows preferences content when its sub-tab is clicked', () => {
    renderWithAuth(<SettingsTab />)

    fireEvent.click(screen.getByRole('tab', { name: /предпочтения/i }))

    expect(screen.getByText(/тема/i)).toBeInTheDocument()
    expect(screen.getByText(/язык/i)).toBeInTheDocument()
  })
})
