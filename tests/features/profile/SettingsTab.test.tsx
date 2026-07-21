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

    expect(screen.getByText(/акцент/i)).toBeInTheDocument()
    expect(screen.getByText(/язык/i)).toBeInTheDocument()
  })

  it('renders three accent swatches inside a radiogroup', () => {
    renderWithAuth(<SettingsTab />)
    fireEvent.click(screen.getByRole('tab', { name: /предпочтения/i }))

    const group = screen.getByRole('radiogroup', { name: /выбор акцентного цвета/i })
    expect(group).toBeInTheDocument()

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  it('marks the default accent (purple) as checked', () => {
    renderWithAuth(<SettingsTab />)
    fireEvent.click(screen.getByRole('tab', { name: /предпочтения/i }))

    const purple = screen.getByRole('radio', { name: /пурпурный/i })
    expect(purple).toHaveAttribute('aria-checked', 'true')

    const lime = screen.getByRole('radio', { name: /лаймовый/i })
    expect(lime).toHaveAttribute('aria-checked', 'false')

    const cyan = screen.getByRole('radio', { name: /циан/i })
    expect(cyan).toHaveAttribute('aria-checked', 'false')
  })

  it('switches accent when a different swatch is clicked', () => {
    renderWithAuth(<SettingsTab />)
    fireEvent.click(screen.getByRole('tab', { name: /предпочтения/i }))

    fireEvent.click(screen.getByRole('radio', { name: /циан/i }))

    expect(screen.getByRole('radio', { name: /циан/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /пурпурный/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('accent swatches use a flat swatch layout (no slider overflow possible)', () => {
    renderWithAuth(<SettingsTab />)
    fireEvent.click(screen.getByRole('tab', { name: /предпочтения/i }))

    // The old buggy slider used translate-x up to 48px inside a w-14 (56px) track.
    // The new design uses discrete swatches inside a radiogroup — no translate-x overflow.
    const radiogroup = screen.getByRole('radiogroup', { name: /выбор акцентного цвета/i })
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)

    // All 3 swatches must be direct children of the radiogroup
    radios.forEach((radio) => {
      expect(radiogroup).toContainElement(radio)
    })

    // Verify no element uses translate-x (the old slider pattern)
    radios.forEach((radio) => {
      const style = radio.getAttribute('style') || ''
      expect(style).not.toMatch(/translate-x/)
    })
  })
})
