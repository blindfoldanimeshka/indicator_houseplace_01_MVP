import { render, screen } from '@testing-library/react'
import { ProfilePage } from '@/features/profile/components/ProfilePage'

it('renders profile page with tabs', () => {
  render(<ProfilePage />)
  expect(screen.getByText('Личные данные')).toBeInTheDocument()
  expect(screen.getByText('Аккаунт')).toBeInTheDocument()
})
